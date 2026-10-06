import os
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent


def env_bool(nome: str, padrao: bool = False) -> bool:
    return os.environ.get(nome, "1" if padrao else "0").lower() in {"1", "true", "yes", "on"}


def env_lista(nome: str, padrao: str = "") -> list[str]:
    return [item.strip() for item in os.environ.get(nome, padrao).split(",") if item.strip()]


DEBUG = env_bool("DJANGO_DEBUG")
SECRET_KEY_PADRAO = "dev-insegura-troque-em-producao"  # noqa: S105
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", SECRET_KEY_PADRAO)
if not DEBUG and SECRET_KEY == SECRET_KEY_PADRAO:
    raise ImproperlyConfigured("Defina DJANGO_SECRET_KEY: a chave padrão é pública e só vale com DJANGO_DEBUG=1.")
# "api" é o Host que o proxy do Next usa (API_INTERNAL_URL=http://api:8000); localhost serve o healthcheck.
ALLOWED_HOSTS_PADRAO = "localhost,127.0.0.1,api"
ALLOWED_HOSTS = env_lista("DJANGO_ALLOWED_HOSTS", ALLOWED_HOSTS_PADRAO)
CSRF_TRUSTED_ORIGINS = env_lista("DJANGO_CSRF_TRUSTED_ORIGINS")

INSTALLED_APPS = [
    "ingestao",
    "indicadores",
    "analise",
    "rest_framework",
    "drf_spectacular",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("POSTGRES_DB", "faperon"),
        "USER": os.environ.get("POSTGRES_USER", "faperon"),
        "PASSWORD": os.environ.get("POSTGRES_PASSWORD", "faperon"),
        "HOST": os.environ.get("POSTGRES_HOST", "db"),
        "PORT": os.environ.get("POSTGRES_PORT", "5432"),
    }
}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
]

LANGUAGE_CODE = "pt-br"
TIME_ZONE = "America/Porto_Velho"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedStaticFilesStorage"},
}

SEED_DIR = Path(os.environ.get("SEED_DIR", BASE_DIR / "data" / "seed"))

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.filebased.FileBasedCache",
        "LOCATION": os.environ.get("CACHE_DIR", "/tmp/faperon-cache"),  # noqa: S108
    }
}

REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    # API pública e somente leitura: sem autenticação de propósito. Se surgir login, mude aqui, não view a view.
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.AllowAny"],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_RATES": {"pdf": os.environ.get("PDF_RATE_LIMIT", "10/min")},
    "EXCEPTION_HANDLER": "indicadores.api.erros.tratador_de_excecoes",
    "NUM_PROXIES": int(os.environ.get("NUM_PROXIES", "1")),
}

SPECTACULAR_SETTINGS = {
    "TITLE": "API FAPERON — Central de Inteligência Agropecuária",
    "DESCRIPTION": "Indicadores agropecuários de Rondônia (IBGE PAM e PPM).",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "SCHEMA_PATH_PREFIX": r"/api/v1",
}

SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
X_FRAME_OPTIONS = "SAMEORIGIN"
SESSION_COOKIE_HTTPONLY = True

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {"json": {"()": "config.logs.JsonFormatter"}},
    "handlers": {"console": {"class": "logging.StreamHandler", "formatter": "json"}},
    "root": {"handlers": ["console"], "level": os.environ.get("LOG_LEVEL", "INFO")},
    "loggers": {
        "weasyprint": {"level": "WARNING"},
        "fontTools": {"level": "WARNING"},
        "django.utils.autoreload": {"level": "WARNING"},
    },
}
