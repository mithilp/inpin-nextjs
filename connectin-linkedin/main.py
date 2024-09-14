from linkedin_api import Linkedin
import os

from flask import Flask
from flask import request
app = Flask(__name__)

from dotenv import load_dotenv
load_dotenv()
print("loaded env")

# Authenticate using any Linkedin user account credentials
api = Linkedin('ping.mithil@gmail.com', os.environ['LINKEDIN_PWD'])
print("authenticated")

@app.post("/api/send-linkedin-connection")
def main():
    print(request.args)

    # GET a profile
    people = api.search_people(request.args['query'])
    person = people[0]
    print(person)

    result = api.add_connection(person['urn_id'])
    return {'success': not result}


def create_app():
   return app