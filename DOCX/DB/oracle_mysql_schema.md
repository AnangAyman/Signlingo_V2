# Oracle MySQL Schema Snapshot

Snapshot date: `2026-05-03`

This document records the current live Oracle MySQL schema used by SignLingo.

## Database

- Database name: `signlingo`
- Engine: Oracle Cloud MySQL HeatWave
- Access pattern: SSH tunnel via `127.0.0.1:3307`

## Tables

### `user`

Primary user table used by the Django legacy port.

| Column | Type | Null | Key | Notes |
|--------|------|------|-----|------|
| `id` | `int` | NO | PRI | auto increment |
| `name` | `varchar(80)` | NO |  |  |
| `age` | `int` | YES |  |  |
| `email` | `varchar(120)` | NO | UNI |  |
| `password` | `varchar(128)` | NO |  | stores hashed or legacy password |
| `points` | `int` | YES |  |  |
| `lives` | `int` | YES |  |  |
| `username` | `varchar(80)` | YES | UNI |  |
| `streak` | `int` | YES |  |  |
| `last_login_date` | `date` | YES |  |  |
| `is_verified` | `tinyint(1)` | YES |  |  |
| `google_id` | `varchar(128)` | YES | UNI | Google OAuth subject |

### `friendship`

Friend relationship table.

| Column | Type | Null | Key | Notes |
|--------|------|------|-----|------|
| `user_id` | `int` | NO | PRI | FK to `user.id` |
| `friend_id` | `int` | NO | PRI | FK to `user.id` |

Notes:
- Current live table uses a composite primary key on `(user_id, friend_id)`.
- There is no standalone `id` column.
- This schema must stay aligned with the leaderboard query path, which expects friendship rows to be addressable by `(user_id, friend_id)`.

### `course`

| Column | Type | Null | Key | Notes |
|--------|------|------|-----|------|
| `id` | `int` | NO | PRI | auto increment |
| `title` | `varchar(100)` | NO | UNI |  |
| `description` | `text` | YES |  |  |

### `module`

| Column | Type | Null | Key | Notes |
|--------|------|------|-----|------|
| `id` | `int` | NO | PRI | auto increment |
| `title` | `varchar(100)` | NO |  |  |
| `course_id` | `int` | NO | MUL | FK to `course.id` |
| `order` | `int` | YES |  |  |

### `unit`

| Column | Type | Null | Key | Notes |
|--------|------|------|-----|------|
| `id` | `int` | NO | PRI | auto increment |
| `title` | `varchar(100)` | NO |  |  |
| `module_id` | `int` | NO | MUL | FK to `module.id` |
| `order` | `int` | YES |  |  |

### `lesson`

| Column | Type | Null | Key | Notes |
|--------|------|------|-----|------|
| `id` | `int` | NO | PRI | auto increment |
| `lesson_key` | `varchar(50)` | NO | UNI | stable lesson identifier |
| `title` | `varchar(100)` | NO |  |  |
| `url` | `varchar(200)` | YES |  |  |
| `order` | `int` | YES |  |  |
| `unit_id` | `int` | NO | MUL | FK to `unit.id` |

### `user_lesson_status`

| Column | Type | Null | Key | Notes |
|--------|------|------|-----|------|
| `id` | `int` | NO | PRI | auto increment |
| `user_id` | `int` | NO | MUL | FK to `user.id` |
| `lesson_id` | `int` | NO | MUL | FK to `lesson.id` |
| `status` | `varchar(20)` | NO |  |  |
| `score` | `int` | YES |  |  |
| `last_updated` | `datetime` | YES |  | auto-updated by application |

### `shop_item`

| Column | Type | Null | Key | Notes |
|--------|------|------|-----|------|
| `id` | `int` | NO | PRI | auto increment |
| `name` | `varchar(100)` | NO |  |  |
| `description` | `varchar(255)` | NO |  |  |
| `price` | `int` | NO |  |  |
| `icon_class` | `varchar(50)` | NO |  |  |
| `item_key` | `varchar(50)` | NO | UNI | stable item identifier |
| `icon_background_class` | `varchar(50)` | NO |  |  |

### `user_item`

| Column | Type | Null | Key | Notes |
|--------|------|------|-----|------|
| `id` | `int` | NO | PRI | auto increment |
| `user_id` | `int` | NO | MUL | FK to `user.id` |
| `item_id` | `int` | NO | MUL | FK to `shop_item.id` |
| `quantity` | `int` | YES |  |  |

### `django_migrations`

Tracks applied Django migrations.

| Column | Type | Null | Key |
|--------|------|------|-----|
| `id` | `bigint` | NO | PRI |
| `app` | `varchar(255)` | NO |  |
| `name` | `varchar(255)` | NO |  |
| `applied` | `datetime(6)` | NO |  |

### `django_content_type`

| Column | Type | Null | Key |
|--------|------|------|-----|
| `id` | `int` | NO | PRI |
| `app_label` | `varchar(100)` | NO | MUL |
| `model` | `varchar(100)` | NO |  |

### `django_admin_log`

| Column | Type | Null | Key |
|--------|------|------|-----|
| `id` | `int` | NO | PRI |
| `action_time` | `datetime(6)` | NO |  |
| `object_id` | `longtext` | YES |  |
| `object_repr` | `varchar(200)` | NO |  |
| `action_flag` | `smallint unsigned` | NO |  |
| `change_message` | `longtext` | NO |  |
| `content_type_id` | `int` | YES | MUL |
| `user_id` | `int` | NO | MUL |

### `django_session`

| Column | Type | Null | Key |
|--------|------|------|-----|
| `session_key` | `varchar(40)` | NO | PRI |
| `session_data` | `longtext` | NO |  |
| `expire_date` | `datetime(6)` | NO | MUL |

### `auth_user`

Standard Django auth tables remain present from the Django runtime.

| Column | Type | Null | Key |
|--------|------|------|-----|
| `id` | `int` | NO | PRI |
| `password` | `varchar(128)` | NO |  |
| `last_login` | `datetime(6)` | YES |  |
| `is_superuser` | `tinyint(1)` | NO |  |
| `username` | `varchar(150)` | NO | UNI |
| `first_name` | `varchar(150)` | NO |  |
| `last_name` | `varchar(150)` | NO |  |
| `email` | `varchar(254)` | NO |  |
| `is_staff` | `tinyint(1)` | NO |  |
| `is_active` | `tinyint(1)` | NO |  |
| `date_joined` | `datetime(6)` | NO |  |

### `auth_group`

| Column | Type | Null | Key |
|--------|------|------|-----|
| `id` | `int` | NO | PRI |
| `name` | `varchar(150)` | NO | UNI |

### `auth_permission`

| Column | Type | Null | Key |
|--------|------|------|-----|
| `id` | `int` | NO | PRI |
| `name` | `varchar(255)` | NO |  |
| `content_type_id` | `int` | NO | MUL |
| `codename` | `varchar(100)` | NO |  |

### Through tables

#### `auth_group_permissions`

| Column | Type | Null | Key |
|--------|------|------|-----|
| `id` | `bigint` | NO | PRI |
| `group_id` | `int` | NO | MUL |
| `permission_id` | `int` | NO | MUL |

#### `auth_user_groups`

| Column | Type | Null | Key |
|--------|------|------|-----|
| `id` | `bigint` | NO | PRI |
| `user_id` | `int` | NO | MUL |
| `group_id` | `int` | NO | MUL |

#### `auth_user_user_permissions`

| Column | Type | Null | Key |
|--------|------|------|-----|
| `id` | `bigint` | NO | PRI |
| `user_id` | `int` | NO | MUL |
| `permission_id` | `int` | NO | MUL |

### `alembic_version`

Legacy migration marker left from the previous Flask/Alembic setup.

| Column | Type | Null | Key |
|--------|------|------|-----|
| `version_num` | `varchar(32)` | NO | PRI |

## Foreign Keys

- `friendship.user_id` -> `user.id`
- `friendship.friend_id` -> `user.id`
- `lesson.unit_id` -> `unit.id`
- `module.course_id` -> `course.id`
- `unit.module_id` -> `module.id`
- `user_item.user_id` -> `user.id`
- `user_item.item_id` -> `shop_item.id`
- `user_lesson_status.user_id` -> `user.id`
- `user_lesson_status.lesson_id` -> `lesson.id`
- `auth_permission.content_type_id` -> `django_content_type.id`
- `auth_group_permissions.group_id` -> `auth_group.id`
- `auth_group_permissions.permission_id` -> `auth_permission.id`
- `auth_user_groups.user_id` -> `auth_user.id`
- `auth_user_groups.group_id` -> `auth_group.id`
- `auth_user_user_permissions.user_id` -> `auth_user.id`
- `auth_user_user_permissions.permission_id` -> `auth_permission.id`
- `django_admin_log.content_type_id` -> `django_content_type.id`
- `django_admin_log.user_id` -> `auth_user.id`

## Notes

- The live `friendship` table is composite-key based and has no `id` column.
- The legacy `alembic_version` table still exists, but it is not part of the current Django migration flow.
- The application user table is the custom `user` table, not Django's `auth_user`.
