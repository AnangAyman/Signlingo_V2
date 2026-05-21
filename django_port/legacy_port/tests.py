import json
from datetime import datetime, timezone as datetime_timezone
from unittest.mock import patch

from django.core.management import call_command
from django.db import IntegrityError
from django.test import override_settings
from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile

from .models import Lesson, ShopItem, User, UserItem, UserLessonStatus
from .services import seed_initial_data
from shared_port.view_helpers import _build_streak_data


class LegacyPortFlowTests(TestCase):
    def setUp(self):
        seed_initial_data()
        self.user = User.objects.create(
            name="Yeongjin An",
            age=24,
            email="yeongjin@example.com",
            password="testpass",
            username="@yeongjin",
            is_verified=True,
            points=1500,
            lives=3,
        )
        self.friend = User.objects.create(
            name="Friend User",
            age=24,
            email="friend@example.com",
            password="testpass",
            username="@friend",
            is_verified=True,
            points=250,
            lives=5,
        )

        session = self.client.session
        session["user_id"] = self.user.id
        session["user"] = self.user.email
        session.save()

    def test_health_endpoint_reports_django_runtime(self):
        # Keep the public deployment probe covered because Render and teammates use it for smoke checks.
        response = self.client.get("/health/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok", "framework": "django"})

    def test_add_friend_json_response(self):
        response = self.client.post(
            f"/add_friend/{self.friend.id}",
            content_type="application/json",
            HTTP_ACCEPT="application/json",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["success"])
        self.assertEqual(payload["friend"]["name"], self.friend.name)
        self.assertTrue(self.user.is_friends_with(self.friend))

    def test_search_users_returns_matching_results(self):
        response = self.client.get("/search-users", {"q": "Friend"})

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(len(payload), 1)
        self.assertEqual(payload[0]["name"], self.friend.name)

    def test_search_users_returns_empty_list_for_short_query(self):
        response = self.client.get("/search-users", {"q": "F"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])

    def test_save_session_results_and_summary(self):
        game_response = self.client.post(
            "/save-session-results",
            data=json.dumps({"type": "game", "xp": 40, "accuracy": 80, "skipped": False}),
            content_type="application/json",
        )
        ml_response = self.client.post(
            "/save-session-results",
            data=json.dumps({"type": "ml", "xp": 30, "accuracy": 60, "skipped": False}),
            content_type="application/json",
        )
        summary_response = self.client.get("/get-summary-results")

        self.assertEqual(game_response.status_code, 200)
        self.assertEqual(ml_response.status_code, 200)
        self.assertEqual(game_response.json()["message"], "game results saved.")
        self.assertEqual(ml_response.json()["message"], "ml results saved.")
        self.assertEqual(summary_response.status_code, 200)
        self.assertEqual(summary_response.json()["total_xp"], 70)
        self.assertEqual(summary_response.json()["average_accuracy"], 70)

    def test_mark_lesson_status_by_lesson_key(self):
        lesson = Lesson.objects.get(url="/video_learning")
        response = self.client.post(
            "/mark-lesson-status",
            data=json.dumps({"lesson_key": lesson.lesson_key, "status": "completed"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["success"])
        self.assertEqual(payload["status"], "completed")

    def test_mark_lesson_status_defaults_to_completed_when_status_is_missing(self):
        lesson = Lesson.objects.get(url="/video_learning")
        response = self.client.post(
            "/mark-lesson-status",
            data=json.dumps({"lesson_key": lesson.lesson_key}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["success"])
        self.assertEqual(payload["status"], "completed")

    def test_buy_refill_hearts_updates_balance_and_lives(self):
        item = ShopItem.objects.get(item_key="refill_hearts")
        response = self.client.post(
            "/buy-item",
            data=json.dumps({"item_id": item.id}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["success"])
        self.user.refresh_from_db()
        self.assertEqual(self.user.lives, 5)
        self.assertEqual(self.user.points, 1500 - item.price)
        self.assertEqual(payload["new_lives"], 5)

    def test_buy_inventory_item_updates_quantity(self):
        item = ShopItem.objects.get(item_key="xp_boost")
        response = self.client.post(
            "/buy-item",
            data=json.dumps({"item_id": item.id}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["success"])
        self.assertEqual(payload["quantity"], 1)
        self.user.refresh_from_db()
        self.assertEqual(self.user.points, 1500 - item.price)

    def test_user_item_pair_is_unique(self):
        item = ShopItem.objects.get(item_key="xp_boost")
        UserItem.objects.create(user=self.user, item=item, quantity=1)

        with self.assertRaises(IntegrityError):
            UserItem.objects.create(user=self.user, item=item, quantity=1)

    def test_leaderboard_renders_friends_and_league(self):
        self.user.add_friend(self.friend)
        response = self.client.get("/leaderboard")

        self.assertEqual(response.status_code, 200)
        body = response.content.decode("utf-8")
        self.assertIn("Friends", body)
        self.assertIn(self.user.league, body)
        self.assertIn(self.friend.name, body)

    def test_leaderboard_renders_without_friends(self):
        self.user.friendships.all().delete()
        self.friend.friendships.all().delete()

        response = self.client.get("/leaderboard")

        self.assertEqual(response.status_code, 200)
        body = response.content.decode("utf-8")
        self.assertIn("Friends", body)
        self.assertIn(self.user.league, body)
        self.assertNotIn(self.friend.name, body)

    def test_leaderboard_redirects_when_not_logged_in(self):
        self.client.logout()

        response = self.client.get("/leaderboard")

        self.assertEqual(response.status_code, 302)
        self.assertIn("/login", response["Location"])

    def test_add_friend_creates_bidirectional_links(self):
        self.user.add_friend(self.friend)

        self.assertTrue(self.user.is_friends_with(self.friend))
        self.assertTrue(self.friend.is_friends_with(self.user))
        self.assertEqual(User.objects.get(id=self.user.id).friendships.count(), 1)
        self.assertEqual(User.objects.get(id=self.friend.id).friendships.count(), 1)

    def test_remove_friend_deletes_bidirectional_links(self):
        self.user.add_friend(self.friend)

        self.user.remove_friend(self.friend)

        self.assertFalse(self.user.is_friends_with(self.friend))
        self.assertFalse(self.friend.is_friends_with(self.user))
        self.assertEqual(User.objects.get(id=self.user.id).friendships.count(), 0)
        self.assertEqual(User.objects.get(id=self.friend.id).friendships.count(), 0)

    def test_add_friend_is_idempotent(self):
        self.user.add_friend(self.friend)
        self.user.add_friend(self.friend)

        self.assertEqual(User.objects.get(id=self.user.id).friendships.count(), 1)
        self.assertEqual(User.objects.get(id=self.friend.id).friendships.count(), 1)

    def test_remove_friend_json_response(self):
        self.user.add_friend(self.friend)
        response = self.client.post(
            f"/remove_friend/{self.friend.id}",
            content_type="application/json",
            HTTP_ACCEPT="application/json",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["success"])
        self.assertFalse(self.user.is_friends_with(self.friend))

    @patch("games_port.services.predict_bisindo_image", side_effect=RuntimeError("ml runtime unavailable"))
    def test_predict_returns_runtime_error_when_ml_fails(self, _mock_predict):
        upload = SimpleUploadedFile("snapshot.jpg", b"placeholder", content_type="image/jpeg")
        response = self.client.post("/predict", data={"image": upload})

        self.assertEqual(response.status_code, 500)
        payload = response.json()
        self.assertEqual(payload["error"], "Prediction failed due to an ML runtime error.")

    def test_predict_requires_image(self):
        response = self.client.post("/predict")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"], "No image provided")

    @patch("games_port.services.predict_bisindo_image", side_effect=ValueError("No hand detected"))
    def test_predict_returns_validation_error_for_invalid_ml_input(self, _mock_predict):
        upload = SimpleUploadedFile("snapshot.jpg", b"placeholder", content_type="image/jpeg")
        response = self.client.post("/predict", data={"image": upload})

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"], "No hand detected")

    def test_core_pages_and_json_endpoints_render(self):
        page_urls = [
            "/dashboard",
            "/roadmap",
            "/premium",
            "/package",
            "/payment",
            "/course",
            "/shop",
            "/users",
            "/result-summary",
            "/video_learning",
            "/gamepage",
            "/ml_game",
            "/magic_touch",
        ]

        for url in page_urls:
            response = self.client.get(url)
            self.assertEqual(response.status_code, 200, msg=f"{url} did not render successfully")

        question_response = self.client.get("/get-question")
        ml_question_response = self.client.get("/get-question-ml")
        lives_response = self.client.post("/decrement_life")

        self.assertEqual(question_response.status_code, 200)
        self.assertEqual(ml_question_response.status_code, 200)
        self.assertEqual(lives_response.status_code, 200)
        self.assertIn("question", question_response.json())
        self.assertIn("choices", question_response.json())
        self.assertIn("answer", ml_question_response.json())
        self.assertTrue(lives_response.json()["success"])

    def test_capture_route_stays_available(self):
        response = self.client.get("/capture")

        self.assertEqual(response.status_code, 302)
        self.assertTrue(response["Location"].endswith("/ml_game"))

    def test_streak_helper_preserves_original_jakarta_timezone_logic(self):
        lesson = Lesson.objects.get(url="/video_learning")
        status = UserLessonStatus.objects.create(user=self.user, lesson=lesson, status="completed")
        fixed_now = datetime(2026, 4, 13, 16, 30, tzinfo=datetime_timezone.utc)
        UserLessonStatus.objects.filter(id=status.id).update(last_updated=fixed_now)

        with patch("shared_port.view_helpers.timezone.now", return_value=fixed_now):
            today, streak_data, current_streak = _build_streak_data(self.user)

        self.assertEqual(today.isoformat(), "2026-04-13")
        monday_entry = next(entry for entry in streak_data if entry["date"].isoformat() == "2026-04-13")
        self.assertTrue(monday_entry["is_active"])
        self.assertEqual(current_streak, 1)

    def test_dashboard_and_roadmap_show_real_progress(self):
        lesson = Lesson.objects.get(url="/video_learning")
        UserLessonStatus.objects.create(user=self.user, lesson=lesson, status="completed")

        dashboard_response = self.client.get("/dashboard")
        roadmap_response = self.client.get("/roadmap")

        self.assertEqual(dashboard_response.status_code, 200)
        self.assertEqual(roadmap_response.status_code, 200)

        dashboard_body = dashboard_response.content.decode("utf-8")
        roadmap_body = roadmap_response.content.decode("utf-8")
        self.assertIn("25% practiced", dashboard_body)
        self.assertIn("1/4 lessons", dashboard_body)
        self.assertIn("1/4 lessons completed", roadmap_body)
        self.assertIn("lesson-node completed", roadmap_body)

    def test_resume_link_advances_to_next_lesson(self):
        lessons = list(Lesson.objects.order_by("order"))
        for lesson in lessons[:3]:
            UserLessonStatus.objects.create(user=self.user, lesson=lesson, status="completed")

        dashboard_response = self.client.get("/dashboard")
        roadmap_response = self.client.get("/roadmap")

        self.assertEqual(dashboard_response.status_code, 200)
        self.assertEqual(roadmap_response.status_code, 200)

        dashboard_body = dashboard_response.content.decode("utf-8")
        roadmap_body = roadmap_response.content.decode("utf-8")
        self.assertIn("Resume Magic Touch", dashboard_body)
        self.assertIn("window.location.href='/magic_touch'", dashboard_body)
        self.assertIn("Next lesson: Magic Touch", roadmap_body)

    def test_module_complete_unlocks_trophy_state(self):
        for lesson in Lesson.objects.order_by("order"):
            UserLessonStatus.objects.create(user=self.user, lesson=lesson, status="completed")

        dashboard_response = self.client.get("/dashboard")
        roadmap_response = self.client.get("/roadmap")

        self.assertEqual(dashboard_response.status_code, 200)
        self.assertEqual(roadmap_response.status_code, 200)

        dashboard_body = dashboard_response.content.decode("utf-8")
        roadmap_body = roadmap_response.content.decode("utf-8")
        self.assertIn("Review Lessons", dashboard_body)
        self.assertIn("Module complete.", roadmap_body)
        self.assertIn("lesson-node treasure", roadmap_body)

    def test_package_selection_persists_into_payment(self):
        package_response = self.client.post("/package", {"plan": "family"})
        payment_response = self.client.get("/payment")

        self.assertEqual(package_response.status_code, 200)
        self.assertEqual(payment_response.status_code, 200)
        self.assertIn("Family Plan", package_response.content.decode("utf-8"))
        self.assertIn("Family Plan", payment_response.content.decode("utf-8"))

    def test_register_hashes_password_before_saving(self):
        response = self.client.post(
            "/register",
            {
                "name": "New User",
                "age": "22",
                "email": "newuser@example.com",
                "password": "securepass",
                "confirm-password": "securepass",
            },
        )

        self.assertEqual(response.status_code, 302)
        created_user = User.objects.get(email="newuser@example.com")
        self.assertNotEqual(created_user.password, "securepass")
        self.assertTrue(created_user.check_password("securepass"))

    def test_legacy_plain_text_login_upgrades_password_hash(self):
        legacy_user = User.objects.create(
            name="Legacy User",
            age=26,
            email="legacy@example.com",
            password="legacy-pass",
            username="@legacy",
            is_verified=False,
        )

        response = self.client.post("/login", {"email": "legacy@example.com", "password": "legacy-pass"})

        self.assertEqual(response.status_code, 302)
        legacy_user.refresh_from_db()
        self.assertNotEqual(legacy_user.password, "legacy-pass")
        self.assertTrue(legacy_user.check_password("legacy-pass"))
        self.assertTrue(legacy_user.is_verified)

    def test_reset_password_hashes_new_password(self):
        reset_user = User.objects.create(
            name="Reset User",
            age=28,
            email="reset@example.com",
            password="old-password",
            username="@reset",
            is_verified=True,
        )

        session = self.client.session
        session["user_id"] = reset_user.id
        session["user"] = reset_user.email
        session.save()

        forgot_response = self.client.post("/forgot-password", {"email": "reset@example.com"}, follow=True)

        self.assertEqual(forgot_response.status_code, 200)
        body = forgot_response.content.decode("utf-8")
        marker = "/reset_password/"
        token_start = body.find(marker)
        self.assertNotEqual(token_start, -1)
        token = body[token_start + len(marker):].split("<", 1)[0].strip()

        reset_response = self.client.post(
            f"/reset_password/{token}",
            {"password": "new-secure-pass", "confirm_password": "new-secure-pass"},
        )

        self.assertEqual(reset_response.status_code, 302)
        reset_user.refresh_from_db()
        self.assertNotEqual(reset_user.password, "new-secure-pass")
        self.assertTrue(reset_user.check_password("new-secure-pass"))

    @override_settings(
        EMAIL_HOST_USER="signlingo@example.com",
        EMAIL_HOST_PASSWORD="app-password",
        DEFAULT_FROM_EMAIL="signlingo@example.com",
    )
    @patch("accounts_port.views.safe_send_email", return_value=True)
    def test_forgot_password_uses_email_delivery_when_configured(self, _mock_send):
        response = self.client.post("/forgot-password", {"email": "yeongjin@example.com"}, follow=True)

        self.assertEqual(response.status_code, 200)
        body = response.content.decode("utf-8")
        self.assertIn("password reset link has been sent", body)
        self.assertNotIn("/reset_password/", body)

    @override_settings(
        GOOGLE_CLIENT_ID="client-id",
        GOOGLE_CLIENT_SECRET="client-secret",
        GOOGLE_REDIRECT_URI="http://127.0.0.1:8000/login/google/callback",
    )
    def test_google_login_redirects_to_authorization_endpoint(self):
        response = self.client.get("/login/google")

        self.assertEqual(response.status_code, 302)
        self.assertIn("accounts.google.com/o/oauth2/v2/auth", response["Location"])
        session = self.client.session
        self.assertIn("google_oauth_state", session)

    @override_settings(
        GOOGLE_CLIENT_ID="client-id",
        GOOGLE_CLIENT_SECRET="client-secret",
        GOOGLE_REDIRECT_URI="http://127.0.0.1:8000/login/google/callback",
    )
    @patch("accounts_port.views.requests.post")
    @patch("accounts_port.views.requests.get")
    def test_google_callback_links_existing_account(self, mock_get, mock_post):
        session = self.client.session
        session["google_oauth_state"] = "state-token"
        session.save()

        mock_post.return_value.ok = True
        mock_post.return_value.json.return_value = {"access_token": "token"}
        mock_get.return_value.ok = True
        mock_get.return_value.json.return_value = {
            "sub": "google-sub-123",
            "email": self.user.email,
            "name": self.user.name,
        }

        response = self.client.get("/login/google/callback", {"state": "state-token", "code": "auth-code"})

        self.assertEqual(response.status_code, 302)
        self.user.refresh_from_db()
        self.assertEqual(self.user.google_id, "google-sub-123")
        self.assertEqual(self.client.session["user_id"], self.user.id)

    @override_settings(
        GOOGLE_CLIENT_ID="client-id",
        GOOGLE_CLIENT_SECRET="client-secret",
        GOOGLE_REDIRECT_URI="http://127.0.0.1:8000/login/google/callback",
    )
    @patch("accounts_port.views.requests.post")
    @patch("accounts_port.views.requests.get")
    def test_google_callback_creates_new_account(self, mock_get, mock_post):
        session = self.client.session
        session["google_oauth_state"] = "state-token"
        session.save()

        mock_post.return_value.ok = True
        mock_post.return_value.json.return_value = {"access_token": "token"}
        mock_get.return_value.ok = True
        mock_get.return_value.json.return_value = {
            "sub": "google-sub-456",
            "email": "new-google@example.com",
            "name": "Google Example",
        }

        response = self.client.get("/login/google/callback", {"state": "state-token", "code": "auth-code"})

        self.assertEqual(response.status_code, 302)
        created_user = User.objects.get(email="new-google@example.com")
        self.assertEqual(created_user.google_id, "google-sub-456")
        self.assertTrue(created_user.is_verified)
        self.assertEqual(self.client.session["user_id"], created_user.id)

    @override_settings(
        GOOGLE_CLIENT_ID="client-id",
        GOOGLE_CLIENT_SECRET="client-secret",
        GOOGLE_REDIRECT_URI="http://127.0.0.1:8000/login/google/callback",
    )
    @patch("accounts_port.views.requests.post")
    @patch("accounts_port.views.requests.get")
    def test_google_callback_flash_message_is_consumed_on_dashboard(self, mock_get, mock_post):
        session = self.client.session
        session["google_oauth_state"] = "state-token"
        session.save()

        mock_post.return_value.ok = True
        mock_post.return_value.json.return_value = {"access_token": "token"}
        mock_get.return_value.ok = True
        mock_get.return_value.json.return_value = {
            "sub": "google-sub-789",
            "email": "flash-google@example.com",
            "name": "Flash Google",
        }

        response = self.client.get("/login/google/callback", {"state": "state-token", "code": "auth-code"}, follow=True)

        self.assertEqual(response.status_code, 200)
        self.assertIn("Signed in with Google successfully.", response.content.decode("utf-8"))

        login_response = self.client.get("/login")
        self.assertEqual(login_response.status_code, 200)
        self.assertNotIn("Signed in with Google successfully.", login_response.content.decode("utf-8"))

    def test_edit_account_updates_profile_and_password(self):
        response = self.client.post(
            "/edit-account",
            {
                "name": "Yeongjin Updated",
                "age": "25",
                "email": "yeongjin.updated@example.com",
                "current_password": "testpass",
                "new_password": "better-pass",
                "confirm_new_password": "better-pass",
            },
            follow=True,
        )

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.name, "Yeongjin Updated")
        self.assertEqual(self.user.email, "yeongjin.updated@example.com")
        self.assertTrue(self.user.check_password("better-pass"))

    def test_edit_account_rejects_invalid_age_instead_of_crashing(self):
        response = self.client.post(
            "/edit-account",
            {
                "name": "Yeongjin Updated",
                "age": "not-a-number",
                "email": "yeongjin.updated@example.com",
            },
            follow=True,
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("Invalid age format.", response.content.decode("utf-8"))
        self.user.refresh_from_db()
        self.assertEqual(self.user.age, 24)

    def test_edit_account_blank_name_falls_back_to_anonymous_wanderer(self):
        response = self.client.post(
            "/edit-account",
            {
                "name": "",
                "age": "24",
                "email": "yeongjin@example.com",
            },
            follow=True,
        )

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.name, "Anonymous Wanderer")

    def test_edit_account_rejects_short_new_password(self):
        response = self.client.post(
            "/edit-account",
            {
                "name": "Yeongjin Updated",
                "age": "25",
                "email": "yeongjin.updated@example.com",
                "current_password": "testpass",
                "new_password": "123",
                "confirm_new_password": "123",
            },
            follow=True,
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("New password must be at least 6 characters long.", response.content.decode("utf-8"))
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("testpass"))

    def test_learning_flow_advances_through_lessons(self):
        lessons = list(Lesson.objects.order_by("order"))

        initial_dashboard = self.client.get("/dashboard").content.decode("utf-8")
        self.assertIn("Resume Learn with Video", initial_dashboard)
        self.assertIn("window.location.href='/video_learning'", initial_dashboard)

        for expected_title, lesson in zip(
            ["Quiz Challenge", "Show Your Signs", "Magic Touch"],
            lessons[:3],
        ):
            mark_response = self.client.post(
                "/mark-lesson-status",
                data=json.dumps({"lesson_key": lesson.lesson_key, "status": "completed"}),
                content_type="application/json",
            )
            self.assertEqual(mark_response.status_code, 200)
            dashboard_body = self.client.get("/dashboard").content.decode("utf-8")
            self.assertIn(f"Resume {expected_title}", dashboard_body)

        final_mark_response = self.client.post(
            "/mark-lesson-status",
            data=json.dumps({"lesson_key": lessons[3].lesson_key, "status": "completed"}),
            content_type="application/json",
        )
        self.assertEqual(final_mark_response.status_code, 200)
        completed_dashboard = self.client.get("/dashboard").content.decode("utf-8")
        self.assertIn("Review Lessons", completed_dashboard)

    def test_reset_legacy_data_command_reseeds_required_records(self):
        self.user.add_friend(self.friend)
        User.objects.create(
            name="Temporary User",
            age=20,
            email="temporary@example.com",
            password="temp-pass",
            username="@temporary",
            is_verified=True,
        )

        call_command("reset_legacy_data")

        self.assertTrue(User.objects.filter(email="admin@example.com").exists())
        self.assertTrue(ShopItem.objects.filter(item_key="refill_hearts").exists())
        self.assertEqual(Lesson.objects.count(), 4)
        self.assertFalse(User.objects.filter(email="temporary@example.com").exists())
