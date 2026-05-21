from django.test import TestCase

from legacy_port.models import User
from legacy_port.services import seed_initial_data


class ApiPortTests(TestCase):
    def setUp(self):
        seed_initial_data()
        self.user = User(
            name="API User",
            email="api@example.com",
            username="@apiuser",
            is_verified=True,
            points=1200,
            lives=4,
        )
        self.user.set_password("secretpass")
        self.user.save()

    def test_api_login_accepts_hashed_password(self):
        # Next.js uses this endpoint before calling the protected dashboard APIs.
        response = self.client.post(
            "/api/auth/login",
            data={"email": self.user.email, "password": "secretpass"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["user"]["email"], self.user.email)
        self.assertEqual(self.client.session["user_id"], self.user.id)

    def test_api_dashboard_requires_authenticated_session(self):
        response = self.client.get("/api/dashboard")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["error"], "Not authenticated")

    def test_api_dashboard_returns_current_user_snapshot(self):
        session = self.client.session
        session["user_id"] = self.user.id
        session["user"] = self.user.email
        session.save()

        response = self.client.get("/api/dashboard")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["user"]["email"], self.user.email)
        self.assertIn("completedLessons", payload)
