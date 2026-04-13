from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from models import db
from initialization import get_or_create_lessons_from_json, create_admin_user, seed_shop_items
import os
from flask_mail import Mail
from dotenv import load_dotenv
import click

load_dotenv()

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URI', 'sqlite:///users.sqlite')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY') or 'dev-unsafe-change-me'  # Required for session management

app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
mail_username = os.environ.get('MAIL_USERNAME')
mail_password = os.environ.get('MAIL_PASSWORD')
if mail_username and mail_password:
    app.config['MAIL_USERNAME'] = mail_username
    app.config['MAIL_PASSWORD'] = mail_password
else:
    # Dev-friendly default: keep the app running even if mail is not configured.
    # Password reset / verify flows that require email will not send messages.
    app.config['MAIL_SUPPRESS_SEND'] = True
mail = Mail(app)


# Import and register the Blueprint
from routes import auth_bp
app.register_blueprint(auth_bp)

db.init_app(app)

from flask_migrate import Migrate
migrate = Migrate(app, db)

if os.environ.get('WERKZEUG_RUN_MAIN') == 'true' or not app.debug:
    print(" * Running on all addresses (0.0.0.0)")
    print(" * Running on http://127.0.0.1:5001  <-- Click here for dev")
    print(" * Running on http://172.21.0.2:5001")

# This command is for resetting the database during the build.
@app.cli.command("init-app")
def init_app_command():
    """Clears existing data and seeds the database with lessons and an admin user."""
    with app.app_context():
        database_uri = app.config['SQLALCHEMY_DATABASE_URI']
        is_sqlite = database_uri.startswith('sqlite:')
        if not is_sqlite and os.environ.get('ALLOW_DB_RESET') != '1':
            raise click.ClickException(
                "Refusing to reset a non-SQLite database. "
                "Set ALLOW_DB_RESET=1 when you intentionally want to run init-app."
            )

        db.drop_all()
        db.create_all()
        print("Database initialized successfully!")
        
        get_or_create_lessons_from_json()
        print("Lessons seeded successfully!")
        
        create_admin_user()
        print("Admin user created.")

        seed_shop_items()
        print("Shop items seeded")
    print("Application initialization finished!")

@app.cli.command("seed-data")
def seed_data_command():
    """Seeds initial lessons, admin user, and shop items without dropping tables."""
    with app.app_context():
        get_or_create_lessons_from_json()
        print("Lessons seeded successfully!")

        create_admin_user()
        print("Admin user checked.")

        seed_shop_items()
        print("Shop items seeded.")
    print("Seed data finished!")

if __name__ == '__main__':
    app.run(debug=True)
