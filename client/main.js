Session.set('questionNum', 1);
Session.set('answerLog', []);

//TEMPLATE 'QUIZ'

Template.quiz.rendered = function(){
  if(!Meteor.user()){
    Router.go('login');
  }
  if(!this.rendered){
    this._rendered = true;
    nextQuestion(true);
  }
};

Template.quiz.events({
  'click #nq': function(){
    nextQuestion();
  },
  'submit #answer': function(event) {
    event.preventDefault();
    var userAnswer = event.target.answer.value;
    event.target.answer.value = '';
    if(userAnswer.length == 0){
      console.log('Empty Input!');
    } else if (userAnswer.match(/[a-z]/i)) {
      console.log('Invalid Input!');
    } else {
      if(userAnswer == eval(Session.get('question'))){
        Session.set('feedback', 'Correct!');
      } else {
        Session.set('feedback', 'Wrong.');
      }
      addToAnswerLog(Session.get('question'), userAnswer);
      if(Session.get('questionNum') >= 10){
        Meteor.call('submitAnswers', Session.get('answerLog'), Meteor.userId(), Meteor.user().username);
        Router.go('results');
      } else {
        nextQuestion();
      }
    }
  }
});

Template.quiz.helpers({
  'question': function(){
    return Session.get('question');
  },
  'feedback': function(){
    return Session.get('feedback');
  },
  'questionNum': function(){
    return Session.get('questionNum');
  },
});

nextQuestion = function(noincrement){
  Meteor.call('generateQuestion', function(err, data){
    if (err){
      console.log(err);
    }
    Session.set('question', data);
    if(!noincrement){
      Session.set('questionNum', Session.get('questionNum') + 1);
    }
  });
}

addToAnswerLog = function(var1, var2){
  var array = Session.get('answerLog');
  array.push([var1, var2]);
  Session.set('answerLog', array);
}

//TEMPLATE 'RESULTS'

Template.results.helpers({
  'settings': function(){
    var tableData = getTableData();
    return {
      showFilter: false,
      showNavigation: 'never',
      collection: tableData.data,
      showNavigationRowsPerPage: false,
      rowClass: getRowClass,
      fields: [
        {key: '0', label: 'Question', sortable: false},
        {key: '1', label: 'Your Answer', sortable: false},
        {key: '2', label: 'Correct Answer', sortable: false, hidden: function() {
          if(tableData.wrongAns == 0){
            return true;
          } else {
            return false;
          }
        }}
      ]
    };
  }
});

getTableData = function(){
    var array = Session.get('answerLog');
    var wrongAns = 0;
    for (var i = 0; i < array.length; i++) {
      if(eval(array[i][0]) != array[i][1]){
        array[i].push(eval(array[i][0]))
        wrongAns++;
      }
    }
    var tableData = {data: array, wrongAns: wrongAns};
    return tableData;
}

getRowClass = function(element){
  if(eval(element[0]) != element[1]){
    return "danger";
  } else {
    return "success";
  }
}

Template.login.events({
  'submit #login-form' : function(e, t){
    e.preventDefault();
    // retrieve the input field values
    var email = t.find('#login-email').value
      , password = t.find('#login-password').value;

      // Trim and validate your fields here....

      // If validation passes, supply the appropriate fields to the
      // Meteor.loginWithPassword() function.
      Meteor.loginWithPassword(email, password, function(err){
      if (err) {
        // The user might not have been found, or their passwword
        // could be incorrect. Inform the user that their
        // login attempt has failed.
      }
      else {
        console.log('Login Success');
        Router.go('/');
    }});
       return false;
    }
});

Template.register.events({
    'submit #register-form' : function(e, t) {
      e.preventDefault();
      var email = t.find('#account-email').value
        , password = t.find('#account-password').value;

        // Trim and validate the input

      Accounts.createUser({email: email, password : password}, function(err){
          if (err) {
            // Inform the user that account creation failed
          } else {
            console.log("User created");
            Router.go('login');
          }

        });

      return false;
    }
  });