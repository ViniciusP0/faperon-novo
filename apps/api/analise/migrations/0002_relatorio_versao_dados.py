from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("analise", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="relatorio",
            name="versao_dados",
            field=models.CharField(db_index=True, default="", max_length=20),
        ),
    ]
