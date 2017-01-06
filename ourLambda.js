const aws = require('aws-sdk'),
  //This will be used to generate a UUID for Salts
  //Will use the native nodeJS crypto module, and use sha256 as the hashing function
  crypto = require('crypto'),
  HASHING_FUNCTION_NAME = 'sha256',
  DYNAMO = new aws.DynamoDB({
    apiVersion: '2012-08-10',
    //This will need to be set to your particular region
    region: 'us-east-1',
  }),
  USER_TABLE_NAME = 'jacksonStoneTestUsers';

var done;
//We initilize these functions outside the handler so that they will
//Only be initilized once, assuming we execute this Lambda many times in a row

/**
* Verifies a user exists
* @param body - The body passed to the lambda
* @param callack - what will be executed once we have checked for a user
*/
function checkForUser(body, callback){
    var username = body.username
    if(!username) { return callback({error: 'no username'}, null, done); }
    const query = {
        Key: {
          Username:{
            S:username
          }
        }, 
        TableName: USER_TABLE_NAME
      }
    DYNAMO.getItem(query, (err, data) => {
        if(data) {
            callback(err, {actualUser:data.Item, claimedUser:body}, done);
        }
        else callback(err, null, done);
      
    });
}

function verifyCredentials(error, data, callback) {
    if(error || !data) return callback(error);
    
    const actual = data.actualUser,
        claimed = data.claimedUser;
    
    if(!actual || !claimed) return callback({error:'No User Found'});
    if(actual.Password.S === hashPassword(claimed.password, actual.Salt.S)) {
        return callback(null, {message: "Correct password for: " + actual.Username.S});
    } else {
        return callback({error: 'Wrong password for: ' + actual.Username.S});
    }
}

function hashPassword(password, salt){
  hashFunction = crypto.createHash(HASHING_FUNCTION_NAME);
  return hashFunction.update(password+salt).digest('base64');
}
//When the callback argument passed here is resolved, the lambda returns the results
exports.handler = (event, context, callback) => {
    
    done = function(err, res){
      callback(null, {
        statusCode: err ? '400' : '200',
        body: err ? JSON.stringify(err) : JSON.stringify(res),
        headers: {
            'Content-Type': 'application/json',
        }
      }
    });
    //Event is the payload passed to the Lambda 
    //(in our case the {username, password} json object)
    checkForUser(event, verifyCredentials);
    
};


