# SignLingo ERD Preview

## Oracle MySQL DB vs Source Model

```mermaid
erDiagram
    USER {
        int id PK
        varchar name
        int age
        varchar email UK
        varchar password
        int points
        boolean is_verified "SOURCE ONLY, missing in Oracle MySQL"
        int lives
        varchar username UK
        int streak
        date last_login_date
    }

    COURSE {
        int id PK
        varchar title UK
        text description
    }

    MODULE {
        int id PK
        varchar title
        int course_id FK
        int order
    }

    UNIT {
        int id PK
        varchar title
        int module_id FK
        int order
    }

    LESSON {
        int id PK
        varchar lesson_key UK
        varchar title
        varchar url
        int unit_id FK
        int order
    }

    USER_LESSON_STATUS {
        int id PK
        int user_id FK
        int lesson_id FK
        varchar status
        int score
        datetime last_updated
    }

    SHOP_ITEM {
        int id PK
        varchar name
        varchar description
        int price
        varchar icon_class
        varchar icon_background_class
        varchar item_key UK
    }

    USER_ITEM {
        int id PK
        int user_id FK
        int item_id FK
        int quantity
    }

    FRIENDSHIP {
        int user_id PK, FK
        int friend_id PK, FK
    }

    COURSE ||--o{ MODULE : has
    MODULE ||--o{ UNIT : has
    UNIT ||--o{ LESSON : has
    USER ||--o{ USER_LESSON_STATUS : tracks
    LESSON ||--o{ USER_LESSON_STATUS : tracked_by
    USER ||--o{ USER_ITEM : owns
    SHOP_ITEM ||--o{ USER_ITEM : referenced_by
    USER ||--o{ FRIENDSHIP : user_id
    USER ||--o{ FRIENDSHIP : friend_id
```

## 확인된 불일치

| 항목 | Source | Oracle MySQL |
|------|--------|--------------|
| `user.is_verified` | 있음 | 없음 |
| `password` 길이 | `String(80)` | `varchar(80)` |
| Python-side defaults | 있음 | DB default 없음 |
| cascade delete | 코드 relationship만 있음 | FK cascade 없음 |
| `user_item` 중복 방지 | unique 없음 | unique 없음 |
