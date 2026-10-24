import gevent.monkey

gevent.monkey.patch_all()

import dotenv

dotenv.load_dotenv()
