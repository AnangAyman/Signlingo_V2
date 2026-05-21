from django.contrib import admin

from .models import Course, Lesson, Module, ShopItem, Unit, User, UserItem, UserLessonStatus


admin.site.register(User)
admin.site.register(Course)
admin.site.register(Module)
admin.site.register(Unit)
admin.site.register(Lesson)
admin.site.register(UserLessonStatus)
admin.site.register(ShopItem)
admin.site.register(UserItem)
