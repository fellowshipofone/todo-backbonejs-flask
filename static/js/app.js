/*global $ */
/*jshint unused:false */
var app = app || {};
var ENTER_KEY = 13;
var ESC_KEY = 27;

(function () {
    'use strict';

    //
    // Model
    //

    app.Task = Backbone.Model.extend({
        defaults: {
            task: '',
            is_done: false
        },
        toggleIsDone: function () {
            this.save({
                is_done: !this.get('is_done')
            });
        }
    });

    //
    // Collection
    //

    var Tasks = Backbone.Collection.extend({
        model: app.Task,
        url: '/tasks',
        comparator: function (task) {
            return task.get('order');
        },

        // Get items left
        itemsLeft: function () {
            return this.filter(function (task) {
                return !task.get('is_done');
            });
        }
    });

    app.tasks = new Tasks();


    //
    // Task View
    //

    app.TaskView = Backbone.View.extend({

        // DOM manipulation definition
        tagName: 'li',
        template: _.template($('#item-template').html()),

        // DOM events setup
        events: {
            'click .toggle': 'toggleIsDone',
            'dblclick label': 'edit',
            'keydown .edit': 'saveOrRevert',
            'blur .edit': 'save',
            'drop': 'drop'
        },

        // Model events setup
        initialize: function () {
            this.listenTo(this.model, 'change', this.render);
            this.listenTo(this.model, 'destroy', this.remove);
        },

        // Re-render the task
        render: function () {

            this.$el.html(this.template(this.model.toJSON()));
            this.$el.toggleClass('is_done', this.model.get('is_done'));
            this.$input = this.$('.edit');
            return this;
        },

        // Toggle done/not done
        toggleIsDone: function () {
            this.model.toggleIsDone();
        },

        // Switch to "editing" mode
        edit: function () {
            this.$el.addClass('editing');
            this.$input.focus();
        },

        // Save and switch back to "listing"` mode
        save: function () {

            if (!this.$el.hasClass('editing')) {
                return;
            }

            var task_text = this.$input.val().trim();

            // Edit ...
            if (task_text) {
                this.model.save({ task: task_text });
                this.model.trigger('change');
            }

            // ... or delete
            else {
                this.clear();
            }

            this.$el.removeClass('editing');
        },

        // ENTER to save
        // ESCAPE to cancel
        saveOrRevert: function (e) {
            if (e.which === ENTER_KEY) {
                this.save();
            }
            else if (e.which === ESC_KEY) {
                this.$el.removeClass('editing');
            }
        },

        // Remove the item
        clear: function () {
            this.model.destroy();
        },

        drop: function (event, index) {
            this.model.save({order: index});
        }
    });


    //
    // The Application
    //

    // Our overall **AppView** is the top-level piece of UI.
    app.AppView = Backbone.View.extend({

        // Instead of generating a new element, bind to the existing skeleton of
        // the App already present in the HTML.
        el: '#tictailtodo',

        // Our template for the line of statistics at the bottom of the app.
        statsTemplate: _.template($('#stats-template').html()),

        events: {
            'keypress #new-task': 'createOnEnter',
            'click #toggle-all': 'toggleAllDone',
            'click .create-task': 'create'
        },


        // DOM initialization
        // Collections events setup
        initialize: function () {
            this.allCheckbox = this.$('#toggle-all')[0];
            this.$input = this.$('#new-task');
            this.$footer = this.$('#footer');
            this.$main = this.$('#main');
            this.$list = $('#todo-list');

            this.$list.sortable({
                stop: function (event, ui) {
                    ui.item.trigger('drop', ui.item.index());
                }
            });

            this.listenTo(app.tasks, 'add', this.addOne);
            this.listenTo(app.tasks, 'reset', this.addAll);
            this.listenTo(app.tasks, 'all', this.render);

            // Suppresses 'add' events with {reset: true} and prevents the app view
            // from being re-rendered for every model. Only renders when the 'reset'
            // event is triggered at the end of the fetch.
            app.tasks.fetch({reset: true});
        },

        // Re-render statistics
        render: function () {
            var itemsLeft = app.tasks.itemsLeft().length;

            if (app.tasks.length) {
                this.$main.show();
                this.$footer.show();

                this.$footer.html(this.statsTemplate({
                    itemsLeft: itemsLeft
                }));

            } else {
                this.$main.hide();
                this.$footer.hide();
            }

        },

        // Add a single task
        addOne: function (task) {
            var view = new app.TaskView({ model: task });
            this.$list.append(view.render().el);
        },

        // Add all tasks
        addAll: function () {
            this.$list.html('');
            app.tasks.each(this.addOne, this);
        },

        // Create a new item
        create: function () {
            if (this.$input.val().trim()) {
                app.tasks.create({
                    task: this.$input.val().trim(),
                    is_done: false
                });
                this.$input.val('');
            }
        },

        // Create a new item
        createOnEnter: function (e) {
            if (e.which === ENTER_KEY) {
                this.create();
            }
        },

        toggleAllDone: function () {
            var is_done = this.allCheckbox.checked;

            app.tasks.each(function (task) {
                task.save({
                    is_done: is_done
                });
            });
        }
    });


    Backbone.history.start();

    // kick things off by creating the `App`
    new app.AppView();

})();