Session.set('questionNum', 1);
Session.set('CorrectNum', 0);
Session.set('answerLog', []);

Data = new Mongo.Collection("data");
Meteor.subscribe("data");

Accounts.ui.config({
    passwordSignupFields: 'USERNAME_ONLY'
});

//TEMPLATE 'QUIZ'

Template.quiz.rendered = function() {
    if (!Meteor.user()) {
        Router.go('login');
    }
    if (!this.rendered) {
        this._rendered = true;
        nextQuestion(true);
        Session.set('newUserFeedback', '');
    }
};

Template.quiz.events({
    'click #nq': function() {
        nextQuestion();
    },
    'submit #answer': function(event) {
        event.preventDefault();
        var userAnswer = event.target.answer.value;
        event.target.answer.value = '';
        if (userAnswer.length == 0) {
            console.log('Empty Input!');
        } else if (userAnswer.match(/[a-z]/i)) {
            console.log('Invalid Input!');
        } else {
            if (userAnswer == eval(Session.get('question'))) {
                Session.set('feedback', 'Correct!');
                Session.set('CorrectNum', Session.get('CorrectNum') + 1);
            } else {
                Session.set('feedback', 'Wrong.');
            }
            addToAnswerLog(Session.get('question'), userAnswer);
            if (Session.get('questionNum') >= 10) {
                Meteor.call('submitAnswers', Session.get('answerLog'), Session.get('CorrectNum'), Meteor.userId(), Meteor.user().username);
                Router.go('results');
            } else {
                nextQuestion();
            }
        }
    }
});

Template.quiz.helpers({
    'question': function() {
        return Session.get('question');
    },
    'feedback': function() {
        return Session.get('feedback');
    },
    'questionNum': function() {
        return Session.get('questionNum');
    },
});

nextQuestion = function(noincrement) {
    Meteor.call('generateQuestion', function(err, data) {
        if (err) {
            console.log(err);
        }
        Session.set('question', data);
        if (!noincrement) {
            Session.set('questionNum', Session.get('questionNum') + 1);
        }
    });
}

addToAnswerLog = function(var1, var2) {
    var array = Session.get('answerLog');
    array.push([var1, var2]);
    Session.set('answerLog', array);
}

//TEMPLATE 'RESULTS'

Template.results.helpers({
    'settings': function() {
        var tableData = getTableData();
        return {
            showFilter: false,
            showNavigation: 'never',
            collection: tableData.data,
            showNavigationRowsPerPage: false,
            rowClass: getRowClass,
            fields: [{
                key: '0',
                label: 'Question',
                sortable: false
            }, {
                key: '1',
                label: 'Your Answer',
                sortable: false
            }, {
                key: '2',
                label: 'Correct Answer',
                sortable: false,
                hidden: function() {
                    if (tableData.wrongAns == 0) {
                        return true;
                    } else {
                        return false;
                    }
                }
            }]
        };
    }
});

getTableData = function() {
    var array = Session.get('answerLog');
    var wrongAns = 0;
    for (var i = 0; i < array.length; i++) {
        if (eval(array[i][0]) != array[i][1]) {
            array[i].push(eval(array[i][0]))
            wrongAns++;
        }
    }
    var tableData = {
        data: array,
        wrongAns: wrongAns
    };
    console.log(tableData);
    return tableData;
}

getRowClass = function(element) {
    if (eval(element[0]) != element[1]) {
        return "danger";
    } else {
        return "success";
    }
}

Template.login.rendered = function() {
        this.$('.dropdown-toggle').remove();
        this.$('.dropdown-menu').show();
    }
    //TEMPLATE 'ADMIN'

Template.admin.helpers({
    'newUserFeedback': function() {
        return Session.get('newUserFeedback');
    },
    'moveToGroupFeedback': function() {
        return Session.get('moveToGroupFeedback')
    }
});

Template.admin.events({
    //TODO MOVE ERRORS TO CLOUD
    'submit #new-user-form': function(e, t) {
        e.preventDefault();
        var username = t.find('#account-username').value;
        var password = t.find('#account-password').value;
        var role = t.find('#account-role').value;
        if (username.length < 1) {
            Session.set('newUserFeedback', 'You must provide a valid username.')
                //TODO further username validation
            return false;
        } else if (password.length < 1) {
            Session.set('newUserFeedback', 'You must provide a valid password.')
                //TODO further password validation
            return false;
        } else if (role.length < 1) {
            Session.set('newUserFeedback', 'You must set a role for this user.')
            return false;
        }
        Meteor.call('createNewUser', username, password, role, function(error) {
            if (error) {
                Session.set('newUserFeedback', error.reason);
            } else {
                t.find('#account-username').value = null;
                t.find('#account-password').value = null;
                Session.set('newUserFeedback', 'New user created successfully.');
            }
        });
    },
    'submit #move-user-form': function(e, t) {
        e.preventDefault();
        var username = t.find('#move-username');
        var role = t.find('#move-role');
        Meteor.call('moveUserToRole', username, role);
    }
});

//TEMPLATE 'PASTRESULTS'

Template.pastresults.helpers({
    'dates': function() {
        var data = Data.find({
            userId: Meteor.userId()
        }, {
            sort: {
                date: -1
            }
        }, {
            fields: {
                date: 1,
                correct: 1,
                q1: 1,
                q2: 1,
                q3: 1,
                q4: 1,
                q5: 1,
                q6: 1,
                q7: 1,
                q8: 1,
                q9: 1,
                q10: 1
            }
        }).fetch();
        var wrongAns = [];
        for (var i = 0; i < data.length; i++) {
            wrongAns.push(0);
            for (var j = 0; j < 10; j++) {
                if (eval(eval("data[" + i + "].q" + (j + 1) + "[0]")) != eval(eval("data[" + i + "].q" + (j + 1) + "[1]"))) {
                    eval("data[" + i + "].q" + (j + 1)).push(eval(eval("data[" + i + "].q" + (j + 1) + "[0]")));
                    wrongAns[i]++;
                } else {
                    eval("data[" + i + "].q" + (j + 1)).push(null);
                }
            }
        }
        var dataObj = [];
        var numCorrect = [];
        for (var i = 0; i < wrongAns.length; i++) {
            numCorrect.push(10 - wrongAns[i]);
        }
        Session.set('correctdat', numCorrect);
        for (var i = 0; i < data.length; i++) {
            dataObj.push({
                'date': data[i].date,
                'correct': (10 - wrongAns[i]),
                'data': [
                    [data[i].q1[0], data[i].q1[1], data[i].q1[2]],
                    [data[i].q2[0], data[i].q2[1], data[i].q2[2]],
                    [data[i].q3[0], data[i].q3[1], data[i].q3[2]],
                    [data[i].q4[0], data[i].q4[1], data[i].q4[2]],
                    [data[i].q5[0], data[i].q5[1], data[i].q5[2]],
                    [data[i].q6[0], data[i].q6[1], data[i].q6[2]],
                    [data[i].q7[0], data[i].q7[1], data[i].q7[2]],
                    [data[i].q8[0], data[i].q8[1], data[i].q8[2]],
                    [data[i].q9[0], data[i].q9[1], data[i].q9[2]],
                    [data[i].q10[0], data[i].q10[1], data[i].q10[2]]
                ]
            });
        }
        return dataObj;
    },
    'dateconv': function(ldate) {
        var dateobj = new Date(ldate)
        return moment(dateobj).format("l LT")
    },
    'progChart': function() {
        return {
            title: {
                text: ''
            },
            xAxis: {
                allowDecimals: false,
                lineColor: 'transparent',
                gridLineWidth: 0,
                minorGridLineWidth: 0,
                reversed: true,
                tickInterval: 1,
                minorTickLength: 0,
                tickLength: 0,
                title: {
                    text: ''
                },
                labels: {
                  enabled: false,
                }
            },
            yAxis: {
                allowDecimals: false,
                lineColor: 'transparent',
                gridLineWidth: 0,
                minorGridLineWidth: 0,
                tickInterval: 1,
                minorTickLength: 0,
                tickLength: 0,
                title: {
                    text: ''
                },
                labels: {
                  enabled: false,
                },
                min: -1,
                max: 11
            },
            credits: {
                enabled: false
            },
            tooltip: {
                enabled: false
            },
            plotOptions: {
                series: {
                    allowPointSelect: false,
                    marker: {
                        enabled: false
                    },
                    states: {
                        hover: {
                            enabled: false
                        }
                    }
                }
            },
            series: [{
                showInLegend: false,
                type: 'spline',
                data: Session.get('correctdat'),
                color: {
                    linearGradient: [0, 0, 0, 300],
                    stops: [
                        [0, 'rgb(39, 162, 11)'],
                        [1, 'rgb(197, 13, 34)']
                    ]
                }
            }]
        }
    }
});

Handlebars.registerHelper('settings', function(correct) {
    return {
        showFilter: false,
        showNavigation: 'never',
        showNavigationRowsPerPage: false,
        rowClass: getRowClass,
        fields: [{
            key: '0',
            label: 'Question',
            sortable: false
        }, {
            key: '1',
            label: 'Your Answer',
            sortable: false
        }, {
            key: '2',
            label: 'Correct Answer',
            sortable: false,
            hidden: function() {
                if (correct == 10) {
                    return true;
                } else {
                    return false;
                    Session.set('questionNum', 1);
                    Session.set('CorrectNum', 0);
                    Session.set('answerLog', []);

                    Data = new Mongo.Collection("data");
                    Meteor.subscribe("data");

                    Accounts.ui.config({
                        passwordSignupFields: 'USERNAME_ONLY'
                    });

                    //TEMPLATE 'QUIZ'

                    Template.quiz.rendered = function() {
                        if (!Meteor.user()) {
                            Router.go('login');
                        }
                        if (!this.rendered) {
                            this._rendered = true;
                            nextQuestion(true);
                            Session.set('newUserFeedback', '');
                        }
                    };

                    Template.quiz.events({
                        'click #nq': function() {
                            nextQuestion();
                        },
                        'submit #answer': function(event) {
                            event.preventDefault();
                            var userAnswer = event.target.answer.value;
                            event.target.answer.value = '';
                            if (userAnswer.length == 0) {
                                console.log('Empty Input!');
                            } else if (userAnswer.match(/[a-z]/i)) {
                                console.log('Invalid Input!');
                            } else {
                                if (userAnswer == eval(Session.get('question'))) {
                                    Session.set('feedback', 'Correct!');
                                    Session.set('CorrectNum', Session.get('CorrectNum') + 1);
                                } else {
                                    Session.set('feedback', 'Wrong.');
                                }
                                addToAnswerLog(Session.get('question'), userAnswer);
                                if (Session.get('questionNum') >= 10) {
                                    Meteor.call('submitAnswers', Session.get('answerLog'), Session.get('CorrectNum'), Meteor.userId(), Meteor.user().username);
                                    Router.go('results');
                                } else {
                                    nextQuestion();
                                }
                            }
                        }
                    });

                    Template.quiz.helpers({
                        'question': function() {
                            return Session.get('question');
                        },
                        'feedback': function() {
                            return Session.get('feedback');
                        },
                        'questionNum': function() {
                            return Session.get('questionNum');
                        },
                    });

                    nextQuestion = function(noincrement) {
                        Meteor.call('generateQuestion', function(err, data) {
                            if (err) {
                                console.log(err);
                            }
                            Session.set('question', data);
                            if (!noincrement) {
                                Session.set('questionNum', Session.get('questionNum') + 1);
                            }
                        });
                    }

                    addToAnswerLog = function(var1, var2) {
                        var array = Session.get('answerLog');
                        array.push([var1, var2]);
                        Session.set('answerLog', array);
                    }

                    //TEMPLATE 'RESULTS'

                    Template.results.helpers({
                        'settings': function() {
                            var tableData = getTableData();
                            return {
                                showFilter: false,
                                showNavigation: 'never',
                                collection: tableData.data,
                                showNavigationRowsPerPage: false,
                                rowClass: getRowClass,
                                fields: [{
                                    key: '0',
                                    label: 'Question',
                                    sortable: false
                                }, {
                                    key: '1',
                                    label: 'Your Answer',
                                    sortable: false
                                }, {
                                    key: '2',
                                    label: 'Correct Answer',
                                    sortable: false,
                                    hidden: function() {
                                        if (tableData.wrongAns == 0) {
                                            return true;
                                        } else {
                                            return false;
                                        }
                                    }
                                }]
                            };
                        }
                    });

                    getTableData = function() {
                        var array = Session.get('answerLog');
                        var wrongAns = 0;
                        for (var i = 0; i < array.length; i++) {
                            if (eval(array[i][0]) != array[i][1]) {
                                array[i].push(eval(array[i][0]))
                                wrongAns++;
                            }
                        }
                        var tableData = {
                            data: array,
                            wrongAns: wrongAns
                        };
                        console.log(tableData);
                        return tableData;
                    }

                    getRowClass = function(element) {
                        if (eval(element[0]) != element[1]) {
                            return "danger";
                        } else {
                            return "success";
                        }
                    }

                    Template.login.rendered = function() {
                            this.$('.dropdown-toggle').remove();
                            this.$('.dropdown-menu').show();
                        }
                        //TEMPLATE 'ADMIN'

                    Template.admin.helpers({
                        'newUserFeedback': function() {
                            return Session.get('newUserFeedback');
                        },
                        'moveToGroupFeedback': function() {
                            return Session.get('moveToGroupFeedback')
                        }
                    });

                    Template.admin.events({
                        //TODO MOVE ERRORS TO CLOUD
                        'submit #new-user-form': function(e, t) {
                            e.preventDefault();
                            var username = t.find('#account-username').value;
                            var password = t.find('#account-password').value;
                            var role = t.find('#account-role').value;
                            if (username.length < 1) {
                                Session.set('newUserFeedback', 'You must provide a valid username.')
                                    //TODO further username validation
                                return false;
                            } else if (password.length < 1) {
                                Session.set('newUserFeedback', 'You must provide a valid password.')
                                    //TODO further password validation
                                return false;
                            } else if (role.length < 1) {
                                Session.set('newUserFeedback', 'You must set a role for this user.')
                                return false;
                            }
                            Meteor.call('createNewUser', username, password, role, function(error) {
                                if (error) {
                                    Session.set('newUserFeedback', error.reason);
                                } else {
                                    t.find('#account-username').value = null;
                                    t.find('#account-password').value = null;
                                    Session.set('newUserFeedback', 'New user created successfully.');
                                }
                            });
                        },
                        'submit #move-user-form': function(e, t) {
                            e.preventDefault();
                            var username = t.find('#move-username');
                            var role = t.find('#move-role');
                            Meteor.call('moveUserToRole', username, role);
                        }
                    });

                    //TEMPLATE 'PASTRESULTS'

                    Template.pastresults.helpers({
                        'dates': function() {
                            var data = Data.find({
                                userId: Meteor.userId()
                            }, {
                                sort: {
                                    date: -1
                                }
                            }, {
                                fields: {
                                    date: 1,
                                    correct: 1,
                                    q1: 1,
                                    q2: 1,
                                    q3: 1,
                                    q4: 1,
                                    q5: 1,
                                    q6: 1,
                                    q7: 1,
                                    q8: 1,
                                    q9: 1,
                                    q10: 1
                                }
                            }).fetch();
                            var wrongAns = [];
                            for (var i = 0; i < data.length; i++) {
                                wrongAns.push(0);
                                for (var j = 0; j < 10; j++) {
                                    if (eval(eval("data[" + i + "].q" + (j + 1) + "[0]")) != eval(eval("data[" + i + "].q" + (j + 1) + "[1]"))) {
                                        eval("data[" + i + "].q" + (j + 1)).push(eval(eval("data[" + i + "].q" + (j + 1) + "[0]")));
                                        wrongAns[i]++;
                                    } else {
                                        eval("data[" + i + "].q" + (j + 1)).push(null);
                                    }
                                }
                            }
                            var dataObj = [];
                            var numCorrect = [];
                            for (var i = 0; i < wrongAns.length; i++) {
                                numCorrect.push(10 - wrongAns[i]);
                            }
                            Session.set('correctdat', numCorrect);
                            for (var i = 0; i < data.length; i++) {
                                dataObj.push({
                                    'date': data[i].date,
                                    'correct': (10 - wrongAns[i]),
                                    'data': [
                                        [data[i].q1[0], data[i].q1[1], data[i].q1[2]],
                                        [data[i].q2[0], data[i].q2[1], data[i].q2[2]],
                                        [data[i].q3[0], data[i].q3[1], data[i].q3[2]],
                                        [data[i].q4[0], data[i].q4[1], data[i].q4[2]],
                                        [data[i].q5[0], data[i].q5[1], data[i].q5[2]],
                                        [data[i].q6[0], data[i].q6[1], data[i].q6[2]],
                                        [data[i].q7[0], data[i].q7[1], data[i].q7[2]],
                                        [data[i].q8[0], data[i].q8[1], data[i].q8[2]],
                                        [data[i].q9[0], data[i].q9[1], data[i].q9[2]],
                                        [data[i].q10[0], data[i].q10[1], data[i].q10[2]]
                                    ]
                                });
                            }
                            console.log(dataObj);
                            return dataObj;
                        },
                        'dateconv': function(ldate) {
                            var dateobj = new Date(ldate)
                            return moment(dateobj).format("l LT")
                        },
                        'progChart': function() {
                            console.log(Session.get('correctdat'));
                            Highcharts.chart('chart', {
                                series: [{
                                    type: 'line',
                                    data: Session.get('correctdat')
                                }]
                            })
                        }
                    });

                    Handlebars.registerHelper('settings', function(correct) {
                        return {
                            showFilter: false,
                            showNavigation: 'never',
                            showNavigationRowsPerPage: false,
                            rowClass: getRowClass,
                            fields: [{
                                key: '0',
                                label: 'Question',
                                sortable: false
                            }, {
                                key: '1',
                                label: 'Your Answer',
                                sortable: false
                            }, {
                                key: '2',
                                label: 'Correct Answer',
                                sortable: false,
                                hidden: function() {
                                    if (correct == 10) {
                                        return true;
                                    } else {
                                        return false;
                                    }
                                }
                            }]
                        };
                    });


                    //DEBUG TEMPLATES

                    Template.userlist.helpers({
                        'users': function() {
                            return Meteor.users.find({}, {
                                fields: {
                                    username: 1,
                                    group: 1
                                }
                            });
                        }
                    });

                    Template.user.helpers({
                        'group': function(id) {
                            return ReactiveMethod.call('getRolesForUser', id);
                        }
                    });
                }
            }
        }]
    };
});


//DEBUG TEMPLATES

Template.userlist.helpers({
    'users': function() {
        return Meteor.users.find({}, {
            fields: {
                username: 1,
                group: 1
            }
        });
    }
});

Template.user.helpers({
    'group': function(id) {
        return ReactiveMethod.call('getRolesForUser', id);
        Session.set('questionNum', 1);
        Session.set('CorrectNum', 0);
        Session.set('answerLog', []);

        Data = new Mongo.Collection("data");
        Meteor.subscribe("data");

        Accounts.ui.config({
            passwordSignupFields: 'USERNAME_ONLY'
        });

        //TEMPLATE 'QUIZ'

        Template.quiz.rendered = function() {
            if (!Meteor.user()) {
                Router.go('login');
            }
            if (!this.rendered) {
                this._rendered = true;
                nextQuestion(true);
                Session.set('newUserFeedback', '');
            }
        };

        Template.quiz.events({
            'click #nq': function() {
                nextQuestion();
            },
            'submit #answer': function(event) {
                event.preventDefault();
                var userAnswer = event.target.answer.value;
                event.target.answer.value = '';
                if (userAnswer.length == 0) {
                    console.log('Empty Input!');
                } else if (userAnswer.match(/[a-z]/i)) {
                    console.log('Invalid Input!');
                } else {
                    if (userAnswer == eval(Session.get('question'))) {
                        Session.set('feedback', 'Correct!');
                        Session.set('CorrectNum', Session.get('CorrectNum') + 1);
                    } else {
                        Session.set('feedback', 'Wrong.');
                    }
                    addToAnswerLog(Session.get('question'), userAnswer);
                    if (Session.get('questionNum') >= 10) {
                        Meteor.call('submitAnswers', Session.get('answerLog'), Session.get('CorrectNum'), Meteor.userId(), Meteor.user().username);
                        Router.go('results');
                    } else {
                        nextQuestion();
                    }
                }
            }
        });

        Template.quiz.helpers({
            'question': function() {
                return Session.get('question');
            },
            'feedback': function() {
                return Session.get('feedback');
            },
            'questionNum': function() {
                return Session.get('questionNum');
            },
        });

        nextQuestion = function(noincrement) {
            Meteor.call('generateQuestion', function(err, data) {
                if (err) {
                    console.log(err);
                }
                Session.set('question', data);
                if (!noincrement) {
                    Session.set('questionNum', Session.get('questionNum') + 1);
                }
            });
        }

        addToAnswerLog = function(var1, var2) {
            var array = Session.get('answerLog');
            array.push([var1, var2]);
            Session.set('answerLog', array);
        }

        //TEMPLATE 'RESULTS'

        Template.results.helpers({
            'settings': function() {
                var tableData = getTableData();
                return {
                    showFilter: false,
                    showNavigation: 'never',
                    collection: tableData.data,
                    showNavigationRowsPerPage: false,
                    rowClass: getRowClass,
                    fields: [{
                        key: '0',
                        label: 'Question',
                        sortable: false
                    }, {
                        key: '1',
                        label: 'Your Answer',
                        sortable: false
                    }, {
                        key: '2',
                        label: 'Correct Answer',
                        sortable: false,
                        hidden: function() {
                            if (tableData.wrongAns == 0) {
                                return true;
                            } else {
                                return false;
                            }
                        }
                    }]
                };
            }
        });

        getTableData = function() {
            var array = Session.get('answerLog');
            var wrongAns = 0;
            for (var i = 0; i < array.length; i++) {
                if (eval(array[i][0]) != array[i][1]) {
                    array[i].push(eval(array[i][0]))
                    wrongAns++;
                }
            }
            var tableData = {
                data: array,
                wrongAns: wrongAns
            };
            console.log(tableData);
            return tableData;
        }

        getRowClass = function(element) {
            if (eval(element[0]) != element[1]) {
                return "danger";
            } else {
                return "success";
            }
        }

        Template.login.rendered = function() {
                this.$('.dropdown-toggle').remove();
                this.$('.dropdown-menu').show();
            }
            //TEMPLATE 'ADMIN'

        Template.admin.helpers({
            'newUserFeedback': function() {
                return Session.get('newUserFeedback');
            },
            'moveToGroupFeedback': function() {
                return Session.get('moveToGroupFeedback')
            }
        });

        Template.admin.events({
            //TODO MOVE ERRORS TO CLOUD
            'submit #new-user-form': function(e, t) {
                e.preventDefault();
                var username = t.find('#account-username').value;
                var password = t.find('#account-password').value;
                var role = t.find('#account-role').value;
                if (username.length < 1) {
                    Session.set('newUserFeedback', 'You must provide a valid username.')
                        //TODO further username validation
                    return false;
                } else if (password.length < 1) {
                    Session.set('newUserFeedback', 'You must provide a valid password.')
                        //TODO further password validation
                    return false;
                } else if (role.length < 1) {
                    Session.set('newUserFeedback', 'You must set a role for this user.')
                    return false;
                }
                Meteor.call('createNewUser', username, password, role, function(error) {
                    if (error) {
                        Session.set('newUserFeedback', error.reason);
                    } else {
                        t.find('#account-username').value = null;
                        t.find('#account-password').value = null;
                        Session.set('newUserFeedback', 'New user created successfully.');
                    }
                });
            },
            'submit #move-user-form': function(e, t) {
                e.preventDefault();
                var username = t.find('#move-username');
                var role = t.find('#move-role');
                Meteor.call('moveUserToRole', username, role);
            }
        });

        //TEMPLATE 'PASTRESULTS'

        Template.pastresults.helpers({
            'dates': function() {
                var data = Data.find({
                    userId: Meteor.userId()
                }, {
                    sort: {
                        date: -1
                    }
                }, {
                    fields: {
                        date: 1,
                        correct: 1,
                        q1: 1,
                        q2: 1,
                        q3: 1,
                        q4: 1,
                        q5: 1,
                        q6: 1,
                        q7: 1,
                        q8: 1,
                        q9: 1,
                        q10: 1
                    }
                }).fetch();
                var wrongAns = [];
                for (var i = 0; i < data.length; i++) {
                    wrongAns.push(0);
                    for (var j = 0; j < 10; j++) {
                        if (eval(eval("data[" + i + "].q" + (j + 1) + "[0]")) != eval(eval("data[" + i + "].q" + (j + 1) + "[1]"))) {
                            eval("data[" + i + "].q" + (j + 1)).push(eval(eval("data[" + i + "].q" + (j + 1) + "[0]")));
                            wrongAns[i]++;
                        } else {
                            eval("data[" + i + "].q" + (j + 1)).push(null);
                        }
                    }
                }
                var dataObj = [];
                var numCorrect = [];
                for (var i = 0; i < wrongAns.length; i++) {
                    numCorrect.push(10 - wrongAns[i]);
                }
                Session.set('correctdat', numCorrect);
                for (var i = 0; i < data.length; i++) {
                    dataObj.push({
                        'date': data[i].date,
                        'correct': (10 - wrongAns[i]),
                        'data': [
                            [data[i].q1[0], data[i].q1[1], data[i].q1[2]],
                            [data[i].q2[0], data[i].q2[1], data[i].q2[2]],
                            [data[i].q3[0], data[i].q3[1], data[i].q3[2]],
                            [data[i].q4[0], data[i].q4[1], data[i].q4[2]],
                            [data[i].q5[0], data[i].q5[1], data[i].q5[2]],
                            [data[i].q6[0], data[i].q6[1], data[i].q6[2]],
                            [data[i].q7[0], data[i].q7[1], data[i].q7[2]],
                            [data[i].q8[0], data[i].q8[1], data[i].q8[2]],
                            [data[i].q9[0], data[i].q9[1], data[i].q9[2]],
                            [data[i].q10[0], data[i].q10[1], data[i].q10[2]]
                        ]
                    });
                }
                console.log(dataObj);
                return dataObj;
            },
            'dateconv': function(ldate) {
                var dateobj = new Date(ldate)
                return moment(dateobj).format("l LT")
            },
            'progChart': function() {
                console.log(Session.get('correctdat'));
                Highcharts.chart('chart', {
                    series: [{
                        type: 'line',
                        data: Session.get('correctdat')
                    }]
                })
            }
        });

        Handlebars.registerHelper('settings', function(correct) {
            return {
                showFilter: false,
                showNavigation: 'never',
                showNavigationRowsPerPage: false,
                rowClass: getRowClass,
                fields: [{
                    key: '0',
                    label: 'Question',
                    sortable: false
                }, {
                    key: '1',
                    label: 'Your Answer',
                    sortable: false
                }, {
                    key: '2',
                    label: 'Correct Answer',
                    sortable: false,
                    hidden: function() {
                        if (correct == 10) {
                            return true;
                        } else {
                            return false;
                            Session.set('questionNum', 1);
                            Session.set('CorrectNum', 0);
                            Session.set('answerLog', []);

                            Data = new Mongo.Collection("data");
                            Meteor.subscribe("data");

                            Accounts.ui.config({
                                passwordSignupFields: 'USERNAME_ONLY'
                            });

                            //TEMPLATE 'QUIZ'

                            Template.quiz.rendered = function() {
                                if (!Meteor.user()) {
                                    Router.go('login');
                                }
                                if (!this.rendered) {
                                    this._rendered = true;
                                    nextQuestion(true);
                                    Session.set('newUserFeedback', '');
                                }
                            };

                            Template.quiz.events({
                                'click #nq': function() {
                                    nextQuestion();
                                },
                                'submit #answer': function(event) {
                                    event.preventDefault();
                                    var userAnswer = event.target.answer.value;
                                    event.target.answer.value = '';
                                    if (userAnswer.length == 0) {
                                        console.log('Empty Input!');
                                    } else if (userAnswer.match(/[a-z]/i)) {
                                        console.log('Invalid Input!');
                                    } else {
                                        if (userAnswer == eval(Session.get('question'))) {
                                            Session.set('feedback', 'Correct!');
                                            Session.set('CorrectNum', Session.get('CorrectNum') + 1);
                                        } else {
                                            Session.set('feedback', 'Wrong.');
                                        }
                                        addToAnswerLog(Session.get('question'), userAnswer);
                                        if (Session.get('questionNum') >= 10) {
                                            Meteor.call('submitAnswers', Session.get('answerLog'), Session.get('CorrectNum'), Meteor.userId(), Meteor.user().username);
                                            Router.go('results');
                                        } else {
                                            nextQuestion();
                                        }
                                    }
                                }
                            });

                            Template.quiz.helpers({
                                'question': function() {
                                    return Session.get('question');
                                },
                                'feedback': function() {
                                    return Session.get('feedback');
                                },
                                'questionNum': function() {
                                    return Session.get('questionNum');
                                },
                            });

                            nextQuestion = function(noincrement) {
                                Meteor.call('generateQuestion', function(err, data) {
                                    if (err) {
                                        console.log(err);
                                    }
                                    Session.set('question', data);
                                    if (!noincrement) {
                                        Session.set('questionNum', Session.get('questionNum') + 1);
                                    }
                                });
                            }

                            addToAnswerLog = function(var1, var2) {
                                var array = Session.get('answerLog');
                                array.push([var1, var2]);
                                Session.set('answerLog', array);
                            }

                            //TEMPLATE 'RESULTS'

                            Template.results.helpers({
                                'settings': function() {
                                    var tableData = getTableData();
                                    return {
                                        showFilter: false,
                                        showNavigation: 'never',
                                        collection: tableData.data,
                                        showNavigationRowsPerPage: false,
                                        rowClass: getRowClass,
                                        fields: [{
                                            key: '0',
                                            label: 'Question',
                                            sortable: false
                                        }, {
                                            key: '1',
                                            label: 'Your Answer',
                                            sortable: false
                                        }, {
                                            key: '2',
                                            label: 'Correct Answer',
                                            sortable: false,
                                            hidden: function() {
                                                if (tableData.wrongAns == 0) {
                                                    return true;
                                                } else {
                                                    return false;
                                                }
                                            }
                                        }]
                                    };
                                }
                            });

                            getTableData = function() {
                                var array = Session.get('answerLog');
                                var wrongAns = 0;
                                for (var i = 0; i < array.length; i++) {
                                    if (eval(array[i][0]) != array[i][1]) {
                                        array[i].push(eval(array[i][0]))
                                        wrongAns++;
                                    }
                                }
                                var tableData = {
                                    data: array,
                                    wrongAns: wrongAns
                                };
                                console.log(tableData);
                                return tableData;
                            }

                            getRowClass = function(element) {
                                if (eval(element[0]) != element[1]) {
                                    return "danger";
                                } else {
                                    return "success";
                                }
                            }

                            Template.login.rendered = function() {
                                    this.$('.dropdown-toggle').remove();
                                    this.$('.dropdown-menu').show();
                                }
                                //TEMPLATE 'ADMIN'

                            Template.admin.helpers({
                                'newUserFeedback': function() {
                                    return Session.get('newUserFeedback');
                                },
                                'moveToGroupFeedback': function() {
                                    return Session.get('moveToGroupFeedback')
                                }
                            });

                            Template.admin.events({
                                //TODO MOVE ERRORS TO CLOUD
                                'submit #new-user-form': function(e, t) {
                                    e.preventDefault();
                                    var username = t.find('#account-username').value;
                                    var password = t.find('#account-password').value;
                                    var role = t.find('#account-role').value;
                                    if (username.length < 1) {
                                        Session.set('newUserFeedback', 'You must provide a valid username.')
                                            //TODO further username validation
                                        return false;
                                    } else if (password.length < 1) {
                                        Session.set('newUserFeedback', 'You must provide a valid password.')
                                            //TODO further password validation
                                        return false;
                                    } else if (role.length < 1) {
                                        Session.set('newUserFeedback', 'You must set a role for this user.')
                                        return false;
                                    }
                                    Meteor.call('createNewUser', username, password, role, function(error) {
                                        if (error) {
                                            Session.set('newUserFeedback', error.reason);
                                        } else {
                                            t.find('#account-username').value = null;
                                            t.find('#account-password').value = null;
                                            Session.set('newUserFeedback', 'New user created successfully.');
                                        }
                                    });
                                },
                                'submit #move-user-form': function(e, t) {
                                    e.preventDefault();
                                    var username = t.find('#move-username');
                                    var role = t.find('#move-role');
                                    Meteor.call('moveUserToRole', username, role);
                                }
                            });

                            //TEMPLATE 'PASTRESULTS'

                            Template.pastresults.helpers({
                                'dates': function() {
                                    var data = Data.find({
                                        userId: Meteor.userId()
                                    }, {
                                        sort: {
                                            date: -1
                                        }
                                    }, {
                                        fields: {
                                            date: 1,
                                            correct: 1,
                                            q1: 1,
                                            q2: 1,
                                            q3: 1,
                                            q4: 1,
                                            q5: 1,
                                            q6: 1,
                                            q7: 1,
                                            q8: 1,
                                            q9: 1,
                                            q10: 1
                                        }
                                    }).fetch();
                                    var wrongAns = [];
                                    for (var i = 0; i < data.length; i++) {
                                        wrongAns.push(0);
                                        for (var j = 0; j < 10; j++) {
                                            if (eval(eval("data[" + i + "].q" + (j + 1) + "[0]")) != eval(eval("data[" + i + "].q" + (j + 1) + "[1]"))) {
                                                eval("data[" + i + "].q" + (j + 1)).push(eval(eval("data[" + i + "].q" + (j + 1) + "[0]")));
                                                wrongAns[i]++;
                                            } else {
                                                eval("data[" + i + "].q" + (j + 1)).push(null);
                                            }
                                        }
                                    }
                                    var dataObj = [];
                                    var numCorrect = [];
                                    for (var i = 0; i < wrongAns.length; i++) {
                                        numCorrect.push(10 - wrongAns[i]);
                                    }
                                    Session.set('correctdat', numCorrect);
                                    for (var i = 0; i < data.length; i++) {
                                        dataObj.push({
                                            'date': data[i].date,
                                            'correct': (10 - wrongAns[i]),
                                            'data': [
                                                [data[i].q1[0], data[i].q1[1], data[i].q1[2]],
                                                [data[i].q2[0], data[i].q2[1], data[i].q2[2]],
                                                [data[i].q3[0], data[i].q3[1], data[i].q3[2]],
                                                [data[i].q4[0], data[i].q4[1], data[i].q4[2]],
                                                [data[i].q5[0], data[i].q5[1], data[i].q5[2]],
                                                [data[i].q6[0], data[i].q6[1], data[i].q6[2]],
                                                [data[i].q7[0], data[i].q7[1], data[i].q7[2]],
                                                [data[i].q8[0], data[i].q8[1], data[i].q8[2]],
                                                [data[i].q9[0], data[i].q9[1], data[i].q9[2]],
                                                [data[i].q10[0], data[i].q10[1], data[i].q10[2]]
                                            ]
                                        });
                                    }
                                    console.log(dataObj);
                                    return dataObj;
                                },
                                'dateconv': function(ldate) {
                                    var dateobj = new Date(ldate)
                                    return moment(dateobj).format("l LT")
                                },
                                'progChart': function() {
                                    console.log(Session.get('correctdat'));
                                    Highcharts.chart('chart', {
                                        series: [{
                                            type: 'line',
                                            data: Session.get('correctdat')
                                        }]
                                    })
                                }
                            });

                            Handlebars.registerHelper('settings', function(correct) {
                                return {
                                    showFilter: false,
                                    showNavigation: 'never',
                                    showNavigationRowsPerPage: false,
                                    rowClass: getRowClass,
                                    fields: [{
                                        key: '0',
                                        label: 'Question',
                                        sortable: false
                                    }, {
                                        key: '1',
                                        label: 'Your Answer',
                                        sortable: false
                                    }, {
                                        key: '2',
                                        label: 'Correct Answer',
                                        sortable: false,
                                        hidden: function() {
                                            if (correct == 10) {
                                                return true;
                                            } else {
                                                return false;
                                            }
                                        }
                                    }]
                                };
                            });


                            //DEBUG TEMPLATES

                            Template.userlist.helpers({
                                'users': function() {
                                    return Meteor.users.find({}, {
                                        fields: {
                                            username: 1,
                                            group: 1
                                        }
                                    });
                                }
                            });

                            Template.user.helpers({
                                'group': function(id) {
                                    return ReactiveMethod.call('getRolesForUser', id);
                                }
                            });
                        }
                    }
                }]
            };
        });


        //DEBUG TEMPLATES

        Template.userlist.helpers({
            'users': function() {
                return Meteor.users.find({}, {
                    fields: {
                        username: 1,
                        group: 1
                    }
                });
            }
        });

        Template.user.helpers({
            'group': function(id) {
                return ReactiveMethod.call('getRolesForUser', id);
            }
        });
    }
});
