from datetime import date

from django.db import models


# Association table for friendships.
# In Django we model it explicitly instead of using Flask SQLAlchemy's db.Table helper.
class User(models.Model):
    name = models.CharField(max_length=80)
    age = models.IntegerField(blank=True, null=True)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=80)
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
        if self.points < 1000:
            return "Bronze"
        if self.points < 3000:
            return "Silver"
        if self.points < 6000:
            return "Gold"
        if self.points < 10000:
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


class Friendship(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="friendships")
    friend = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reverse_friendships")

    class Meta:
        db_table = "friendship"
        constraints = [
            models.UniqueConstraint(fields=["user", "friend"], name="unique_friendship_pair"),
        ]


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
