from flask import Flask, render_template, request
from flask.ext.sqlalchemy import SQLAlchemy
import json

# Define the WSGI application object
app = Flask(__name__)

# Configurations
app.config.from_object('config')

# Define the database object which is imported
# by modules and controllers
db = SQLAlchemy(app)


##
##
## Models
##

class Item(db.Model):
    """
    Todo items
    """

    __tablename__ = 'todo_item'

    id = db.Column(db.Integer, primary_key=True)
    task = db.Column(db.String(128), nullable=False)
    is_done = db.Column(db.Boolean, nullable=False)
    order = db.Column(db.SmallInteger, nullable=False)
    date_created = db.Column(db.DateTime, default=db.func.current_timestamp())
    date_modified = db.Column(db.DateTime, default=db.func.current_timestamp(),
                              onupdate=db.func.current_timestamp())

    # New instance instantiation procedure
    def __init__(self, task, is_done, order):
        self.task = task
        self.is_done = is_done
        self.order = order

    def __repr__(self):
        return '<Item %r>' % (self.task)


##
##
## Controllers
##


# Index of the webapp
@app.route('/', methods=['GET'])
def index():
    return render_template("index.html")


# 404 handling
@app.errorhandler(404)
def not_found(error):
    return render_template('404.html'), 404


# List items
@app.route("/tasks", methods=['GET'])
def get_todos():
    selection = [
        {'id': x.id, 'task': x.task, 'is_done': x.is_done, 'order': x.order}
        for x in Item.query.all()]
    return json.dumps(selection)


# Create item
@app.route("/tasks", methods=['POST'])
def create_todo():
    if 'task' in request.json:

        # Check order value
        count = Item.query.count()
        if 'order' in request.json:
            order = request.json['order']
            if order > count:
                order = count
        else:
            order = count

        # Check is_done
        if 'is_done' in request.json:
            is_done = request.json['is_done'] == True
        else:
            is_done = False

        # Re-order items if necessary
        if order < count:
            db.session.query(Item) \
                .filter(Item.order >= order) \
                .update({Item.order: Item.order + 1})

        # Save item
        todo_item = Item(request.json['task'], is_done, order)
        db.session.add(todo_item)

        db.session.commit()

        return json.dumps({'id': todo_item.id})

    else:
        return json.dumps({})


# Get a single item
@app.route("/tasks/<string:todo_id>", methods=['GET'])
def get_todo(todo_id):
    x = Item.query.filter(id=todo_id)

    if x:
        return json.dumps({'id': x.id,
                           'task': x.task,
                           'is_done': x.is_done,
                           'order': x.order})


# Update a single item
@app.route("/tasks/<int:todo_id>", methods=['PUT'])
def update_todo(todo_id):
    x = Item.query.get_or_404(todo_id)

    if 'task' in request.json:
        x.task = request.json['task']

    if 'order' in request.json:
        count = Item.query.count()
        order = request.json['order']
        if order > count:
            order = count

        if x.order < order:
            db.session.query(Item) \
                .filter(Item.order <= order, Item.order > x.order) \
                .update({Item.order: Item.order - 1})
        elif x.order > order:
            db.session.query(Item) \
                .filter(Item.order >= order, Item.order < x.order) \
                .update({Item.order: Item.order + 1})

        x.order = order

    if 'is_done' in request.json:
        x.is_done = request.json['is_done'] == True

    db.session.commit()

    return json.dumps({'id': x.id,
                       'task': x.task,
                       'is_done': x.is_done,
                       'order': x.order})


@app.route("/tasks/<int:todo_id>", methods=['DELETE'])
def delete_todo(todo_id):
    todo_item = Item.query.get_or_404(todo_id)
    db.session.delete(todo_item)

    # Update order
    db.session.query(Item) \
        .filter(Item.order >= todo_item.order) \
        .update({Item.order: Item.order - 1})

    db.session.commit()
    return json.dumps(None)


# Build the database:
db.create_all()


##
##
## Server
##


app.run(host='0.0.0.0', port=8080, debug=True)
