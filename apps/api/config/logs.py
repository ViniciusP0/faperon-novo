import json
import logging


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        corpo = {
            "ts": self.formatTime(record),
            "nivel": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        if record.exc_info:
            corpo["erro"] = self.formatException(record.exc_info)
        return json.dumps(corpo, ensure_ascii=False)
