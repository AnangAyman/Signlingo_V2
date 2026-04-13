# Compatibility layer: keep legacy imports alive while the real logic now lives in feature apps.
from accounts_port.views import edit_account, forgot_password, login, logout, register, reset_password, verify_email
from commerce_port.views import buy_item, package, payment, premium, shop
from core_port.views import dashboard, health, home, roadmap, start
from games_port.views import (
    capture_page,
    check_answer,
    decrement_life,
    gamepage,
    get_question,
    get_question_ml,
    get_summary_results,
    magic_touch,
    ml_game,
    predict,
    result_summary,
    save_session_results,
)
from learning_port.views import course, mark_lesson_status, video_learning
from legacy_port.services import predict_bisindo_image
from shared_port.view_helpers import (
    PROJECT_ROOT,
    UPLOAD_DIR,
    _build_streak_data,
    _current_user,
    _leaderboard_lists,
    _lesson_context,
    _load_signed_token,
    _make_signed_token,
    _normalize_plan,
    _pick_question,
    _predict_fallback,
    _render,
    _require_user,
    _store_session_results,
    _user_shell_context,
    _wants_json_response,
)
from social_port.views import add_friend, leaderboard, list_users, remove_friend, search_users
