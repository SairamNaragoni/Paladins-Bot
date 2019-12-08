"use strict";

const express = require("express");
const bodyParser = require("body-parser");
const md5 = require("md5");
const date = require("date-and-time");
const request = require("request");
const rp = require("request-promise");
const table = require("./table");
const audio = require("./audio");
const http = require("http");
const app = express();
const baseUrl = 'http://api.paladins.com/paladinsapi.svc/';

app.use(
  bodyParser.urlencoded({
    extended: true
  })
);

app.use(bodyParser.json());

var config = {
    devId: process.env.devId,
    authKey: process.env.authKey
};
var tier = ["Qualifying", "Bronze V", "Bronze IV", "Bronze III", "Bronze II", "Bronze I",
"Silver V", "Silver IV", "Silver III", "Silver II", "Silver I",
"Gold V", "Gold IV", "Gold III", "Gold II", "Gold I",
"Platinum V", "Platinum IV", "Platinum III", "Platinum II", "Platinum I",
"Diamond V", "Diamond IV", "Diamond III", "Diamond II", "Diamond I",
"Masters I", "Grandmaster"];

var status = ["Offline","In Lobby","God Selection","In Game","Online","not found"];

var responsePhrases2 = [ "Let me know if you'd like to continue.",
						"Would you like to continue ? ",
						"Would you like to ask more ?",
						"Anything else I can help you with right now ?"
						];

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}
var getSignature = function(methodName,timestamp){
	var signature = config.devId + methodName + config.authKey + timestamp;
	return md5(signature);
}

var getTimeStamp = function(){
	var timestamp = new Date();
	return date.format(timestamp, 'YYYYMMDDHHmmss',true);
}

var getSessionUrl = function(timestamp){
	var methodName = "createsession";
	var signature = getSignature(methodName,timestamp);
	return baseUrl + methodName + 'Json/' + config.devId + "/" + signature + "/" + timestamp;
}
var getUrl = function(methodName,signature,sessionId,timestamp){
	var url = baseUrl + methodName + 'Json/' + config.devId + "/" + signature + "/" +sessionId + "/" + timestamp;
	return url;
}
var generateUrl = function(methodName,sessionId,timestamp,playerName){
	var signature = getSignature(methodName,timestamp);
	var url = getUrl(methodName,signature,sessionId,timestamp);
	if(playerName!=undefined ){
		url = url+"/"+playerName;
	}
	return url;
}
function getData(url){
	return rp(url)
    .then(function (body) {
      return JSON.parse(body);
    }).catch(function (err) {
        console.log(err);
    });
}
var getJsonStringResult = function(jsonArr){
	var result = "";
	for (var key in jsonArr) {
		result += key + " - " + jsonArr[key] + ",\n";
	}
	return result.slice(0, -2) + '.';
}
var takeAction = function(req,res,sessionId){
	var timestamp = getTimeStamp();
	var intent = req.body.queryResult.intent.displayName;
	switch(intent){
				case "Player Stats" :
					var playerName = req.body.queryResult.parameters.playerName;
					var session = req.body.session;
					var url = generateUrl("getplayer",sessionId,timestamp,playerName);
					var errMsg = "Player "+ playerName + " does not exist ,Would you like to try again with another username ?";
					var errMsg2 = "Oops ! Player "+ playerName + " does not exist.\nTry again with a different player name.";
					getData(url).then(function(body){
						if(body[0] == undefined || body[0] == null || body[0] == ""){
							return res.json({
								source : "https://paladins-bot.herokuapp.com/",
								"payload": table.getResponse(errMsg,errMsg2)
							});
						}
						url = generateUrl("getchampionranks",sessionId,timestamp,playerName);
						getData(url).then(function(obj){
							if(obj[0]==undefined || obj[0] ==null || obj[0] == ""){
								return res.json({
									"payload": table.getResponse(errMsg,errMsg2),
									source : "https://paladins-bot.herokuapp.com/"
								});
							}
							else{
								var assists = 0;
								var kills = 0;
								var deaths = 0;
								for(var i=0;i<obj.length;i++)
								{
									var temp = obj[i];
									assists += temp.Assists;
									kills += temp.Kills;
									deaths += temp.Deaths;
								}
								var kda = ((kills+(assists/2))/deaths).toFixed(2);
								var winRate = ((body[0].Wins/(body[0].Wins+body[0].Losses))*100).toFixed(2);
								var resultArr = { "Player Stats": playerName ,
										  "Region" : body[0].Region,
										  "Last Login" : body[0].Last_Login_Datetime,
										  "Level" : body[0].Level.toFixed(0),
										  "KDA" : kda,
										  "Win Rate" : winRate+"%",
										  "Wins" : body[0].Wins.toFixed(0),
										  "Losses" : body[0].Losses.toFixed(0),
										  "Kills/Deaths/Assists" : kills+"/"+deaths+"/"+assists,
										  "Tier" : tier[body[0].RankedConquest.Tier],
										  "TP": body[0].RankedConquest.Points.toFixed(0) };
								var fbResponse = getJsonStringResult(resultArr);
								var simpleResponse = "Here are player stats for Player Name " +playerName + ". "+responsePhrases2[getRandomInt(3)]; 
								table.populateTable(resultArr,simpleResponse,fbResponse,function(returnValue){
									return res.json({
										fulfillmentMessages : returnValue,
										source : "https://paladins-bot.herokuapp.com/"
									});	
								});
							}
				  		});
					});
				break;
			case "Player Status" :
					var playerName = req.body.queryResult.parameters.playerName;
					var url = generateUrl("getplayerstatus",sessionId,timestamp,playerName);
					var errMsg = "Player "+ playerName + " does not exist ,Would you like to try again with another username ?";
					var errMsg2 = "Oops ! Player "+ playerName + " does not exist.\nTry again with a different player name.";
					getData(url).then(function(body){
						if(body[0] == undefined || body[0] == null || body[0] == ""){
							return res.json({
								"payload": table.getResponse(errMsg,errMsg2),
								source : "https://paladins-bot.herokuapp.com/"
							});
						}
						else{
							return res.json({
								"payload": table.getResponse("Player "+playerName+" is "+status[body[0].status] + ". "+responsePhrases2[getRandomInt(3)],"Player "+playerName+" is "+status[body[0].status]),
								source : "https://paladins-bot.herokuapp.com/"
							});
						}
					});
				break;
			case "Last Game" :
					var playerName = req.body.queryResult.parameters.playerName;
					var url = generateUrl("getmatchhistory",sessionId,timestamp,playerName);
					var errMsg = "Player "+ playerName + " does not exist ,Would you like to try again with another username ?";
					var errMsg2 = "Player "+ playerName + " does not exist.\nTry again with a different player name.";
					getData(url).then(function(body){
						if(body[0] == undefined || body[0] == null || body[0] == ""){
							return res.json({
								"payload": table.getResponse(errMsg,errMsg2),
								source : "https://paladins-bot.herokuapp.com/"
							});
						}
						else if(body[0].Map_Game=="" || body[0].Map_Game== null){
							return res.json({
								"payload": table.getResponse("No Match history is available for Player "+ playerName+ " or Invalid IGN . Would you like to try again with another username ?","Invalid IGN/"+errMsg2),
								source : "https://paladins-bot.herokuapp.com/"
							});	
						}
						else{
							var temp = body[0];
							var assists = temp.Assists;
							var	kills = temp.Kills;
							var	deaths = temp.Deaths;
							var kda = ((kills+(assists/2))/deaths).toFixed(2);
							var resultArr = { "Last Game Stats": playerName ,
										  "Region" : body[0].Region,
										  "Status" : body[0].Win_Status,
										  "Match Time" : body[0].Match_Time,
										  "Match Length" : ((body[0].Time_In_Match_Seconds)/60).toFixed(1)+" min",
										  "Map" : body[0].Map_Game.substring(4),
										  "Champion" : body[0].Champion,
										  "KDA" : kda,
										  "Kills/Deaths/Assists" : kills+"/"+deaths+"/"+assists,
										  "Damage Dealt" : body[0].Damage.toFixed(0),
										  "Damage Taken" : body[0].Damage_Taken.toFixed(0) };
							var fbResponse = getJsonStringResult(resultArr);
							var simpleResponse = "Here are Last Game stats for Player " +playerName + ". "+ responsePhrases2[getRandomInt(3)]; 
							table.populateTable(resultArr,simpleResponse,fbResponse,function(returnValue){
								return res.json({
									"payload": table.getResponse(errMsg,errMsg2),
									source : "https://paladins-bot.herokuapp.com/"
								});	
							});
						}
					});
					break;
			case "Voice Lines" :
					var voiceLine = "<speak><audio src='"+audio[getRandomInt(25)] +"'><desc> "+ responsePhrases2[getRandomInt(3)]+" </desc>PURR (sound didn't load)</audio></speak>";
					return res.json({
						"payload": table.getResponse(voiceLine,"No Audio is supported for facebook"),
						source : "https://paladins-bot.herokuapp.com/"
					});	
					break;
			case "Champion Stats" :
					var playerName = req.body.queryResult.parameters.playerName;
					var championName = req.body.queryResult.parameters.championName;
					var url = generateUrl("getchampionranks",sessionId,timestamp,playerName);
					var errMsg = "Player "+ playerName + " . Would you like to give it another try ?";
					var errMsg2 = "Player "+ playerName + ".\nTry again with a different input.";
					getData(url).then(function(body){
						if(body[0] == undefined || body[0] == null || body[0] == ""){
							return res.json({
								"payload": table.getResponse(errMsg,errMsg2),
								source : "https://paladins-bot.herokuapp.com/"
							});
						}
						else{
							body = body.filter(function(item) {
  				  				return item.champion == championName;
							});
							if(body == undefined || body == null || body == ""){
								return res.json({
									"payload": table.getResponse("Champion "+championName+" does not exist ,Would you like to give it another try ?","Champion "+championName+" does not exist.\nTry again with valid champion name."),
									source : "https://paladins-bot.herokuapp.com/"
								});
							}	
							var assists = body[0].Assists;
							var	kills = body[0].Kills;
							var	deaths = body[0].Deaths;
							var kda = ((kills+(assists/2))/deaths).toFixed(2);
							var winRate = ((body[0].Wins/(body[0].Wins+body[0].Losses))*100).toFixed(2);
							var resultArr = { "Champion Stats" : playerName+"'s "+championName ,
										  "Play Time" : ((body[0].Minutes)/60).toFixed(1)+" Hrs",
										  "Level" : body[0].Rank.toFixed(0),
										  "KDA" : kda,
										  "Kills/Deaths/Assists" : kills+"/"+deaths+"/"+assists,
										  "Wins" : body[0].Wins.toFixed(0),
										  "Losses" : body[0].Losses.toFixed(0),
										  "Win Rate" : winRate+" %" };
							var fbResponse = getJsonStringResult(resultArr);
							var simpleResponse = "Here are " +championName + " stats for player "+playerName + ". "+responsePhrases2[getRandomInt(3)]; 
							table.populateTable(resultArr,simpleResponse,fbResponse,function(returnValue){
								return res.json({
									fulfillmentMessages : returnValue,
									source : "https://paladins-bot.herokuapp.com/"
								});	
							});
						}
					});
			default : 
		}
}
global.sessionId = "27382082655A40F5BB86A6FEC1BC0BDF";
app.post("/webhook", function(req, res) {
	var timestamp = getTimeStamp();
	var sessionId = global.sessionId;
	var url = generateUrl("testsession",sessionId,timestamp);
	getData(url).then(function(body){
		if(body.substring(0,7)=="Invalid"){
			url = getSessionUrl(timestamp);
			getData(url).then(function(bodySession){
				global.sessionId = bodySession.session_id;
				takeAction(req,res,global.sessionId);
			});
		}
		else{
			takeAction(req,res,sessionId);	
		}
	});
});

var server = app.listen(process.env.PORT || 8000, function() {
  console.log("Server up and listening");
  var host = server.address().address;
  var port = server.address().port;
  console.log("Paladins Nation listening at https://%s:%s", host, port)
});