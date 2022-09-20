import dataclasses
import json
import logging
from typing import Any

import attrs
import numpy as np


class Encoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif dataclasses.is_dataclass(obj):
            return dataclasses.asdict(obj)
        elif attrs.has(obj):
            logging.debug(f"Serializing attrs class {obj} to {attrs.asdict(obj)}")
            return attrs.asdict(obj)
        return json.JSONEncoder.default(self, obj)
