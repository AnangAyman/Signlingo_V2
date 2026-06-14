from datetime import date
from hmac import compare_digest

from django.db import models
from django.contrib.auth.hashers import check_password as django_check_password
from django.contrib.auth.hashers import identify_hasher, make_password


# Association table for friendships.
# In Django we model it explicitly instead of using Flask SQLAlchemy's db.Table helper.
class User(models.Model):
    name = models.CharField(max_length=80)
    age = models.IntegerField(blank=True, null=True)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=128)
    google_id = models.CharField(max_length=128, blank=True, null=True, unique=True)
    points = models.IntegerField(default=0)
    is_verified = models.BooleanField(default=False)
    lives = models.IntegerField(default=5)
    username = models.CharField(max_length=80, unique=True, blank=True, null=True)
    # Streaks
    streak = models.IntegerField(default=0)
    last_login_date = models.DateField(default=date.today)

    class Meta:
        db_table = "user"

    @property
    def league(self) -> str:
        # Thresholds must match the frontend league config (components/leagues/useLeagueData.ts)
        # so a tier unlocked client-side stays unlocked after re-fetching from the server.
        if self.points < 500:
            return "Bronze"
        if self.points < 1500:
            return "Silver"
        if self.points < 3000:
            return "Gold"
        if self.points < 5000:
            return "Platinum"
        return "Diamond"

    def add_friend(self, other_user: "User") -> None:
        # Add Friends
        if self.id == other_user.id:
            return
        Friendship.objects.get_or_create(user=self, friend=other_user)
        Friendship.objects.get_or_create(user=other_user, friend=self)

    def remove_friend(self, other_user: "User") -> None:
        Friendship.objects.filter(user=self, friend=other_user).delete()
        Friendship.objects.filter(user=other_user, friend=self).delete()

    def is_friends_with(self, other_user: "User") -> bool:
        return Friendship.objects.filter(user=self, friend=other_user).exists()

    def password_is_hashed(self) -> bool:
        try:
            identify_hasher(self.password)
            return True
        except Exception:
            return False

    def set_password(self, raw_password: str) -> None:
        self.password = make_password(raw_password)

    def check_password(self, raw_password: str, upgrade_legacy: bool = False) -> bool:
        if not self.password:
            return False

        if self.password_is_hashed():
            return django_check_password(raw_password, self.password)

        is_valid = compare_digest(self.password, raw_password)
        if is_valid and upgrade_legacy:
            # Upgrade old plain-text passwords in place after a successful legacy login.
            self.set_password(raw_password)
        return is_valid


class Friendship(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="friendships")
    friend = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reverse_friendships")
    pk = models.CompositePrimaryKey("user", "friend")

    class Meta:
        db_table = "friendship"


class Course(models.Model):
    title = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = "course"


class Module(models.Model):
    title = models.CharField(max_length=100)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="modules")
    order = models.IntegerField(default=0)

    class Meta:
        db_table = "module"


class Unit(models.Model):
    title = models.CharField(max_length=100)
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name="units")
    order = models.IntegerField(default=0)

    class Meta:
        db_table = "unit"


class Lesson(models.Model):
    lesson_key = models.CharField(max_length=50, unique=True)
    title = models.CharField(max_length=100)
    url = models.CharField(max_length=200, blank=True, null=True)
    unit = models.ForeignKey(Unit, on_delete=models.CASCADE, related_name="lessons")
    order = models.IntegerField(default=0)

    class Meta:
        db_table = "lesson"


class UserLessonStatus(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="lesson_statuses")
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name="user_statuses")
    status = models.CharField(max_length=20, default="not_started")
    score = models.IntegerField(blank=True, null=True)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "user_lesson_status"
        constraints = [
            models.UniqueConstraint(fields=["user", "lesson"], name="_user_lesson_uc"),
        ]


class ShopItem(models.Model):
    name = models.CharField(max_length=100)
    description = models.CharField(max_length=255)
    price = models.IntegerField()
    icon_class = models.CharField(max_length=50)  # e.g., 'fas fa-heart'
    icon_background_class = models.CharField(max_length=50, default="item-icon")
    item_key = models.CharField(max_length=50, unique=True)  # unique key for logic (e.g., 'refill_hearts')

    class Meta:
        db_table = "shop_item"


class UserItem(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="inventory_items")
    item = models.ForeignKey(ShopItem, on_delete=models.CASCADE, related_name="owned_by")
    quantity = models.IntegerField(default=0)

    # Relationships
    class Meta:
        db_table = "user_item"
        constraints = [
            models.UniqueConstraint(fields=["user", "item"], name="unique_user_item_pair"),
        ]
