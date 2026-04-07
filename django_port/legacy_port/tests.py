import json
from unittest.mock import patch

from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile

from .models import Lesson, ShopItem, User, UserLessonStatus
from .services import seed_initial_data


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

    def test_leaderboard_renders_friends_and_league(self):
        self.user.add_friend(self.friend)
        response = self.client.get("/leaderboard")

        self.assertEqual(response.status_code, 200)
        body = response.content.decode("utf-8")
        self.assertIn("Friends", body)
        self.assertIn(self.user.league, body)
        self.assertIn(self.friend.name, body)

    @patch("legacy_port.views.predict_bisindo_image", side_effect=RuntimeError("ml runtime unavailable"))
    def test_predict_returns_usable_fallback_payload(self, _mock_predict):
        upload = SimpleUploadedFile("snapshot.jpg", b"placeholder", content_type="image/jpeg")
        response = self.client.post("/predict", data={"image": upload})

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("result", payload)
        self.assertTrue(payload["fallback"])
        self.assertGreaterEqual(payload["confidence"], 0.7)

    def test_predict_requires_image(self):
        response = self.client.post("/predict")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"], "No image provided")

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
