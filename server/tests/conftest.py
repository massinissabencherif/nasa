import os
import tempfile

os.environ["HESTIA_DB_PATH"] = os.path.join(tempfile.mkdtemp(prefix="hestia-test-"), "test.db")
