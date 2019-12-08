function populateTable(jsonArr,simpleResponse,fbResponse,callback){
	var rows = [];
	var i=0;
	for(var key in jsonArr){
		var cellsArr = [];
		var cells = {};
		var text1 = {"text" : key};
		var text2 = {"text" : jsonArr[key]};
		cellsArr[0] = text1;
		cellsArr[1] = text2;
		cells.cells = cellsArr;
		cells.dividerAfter = true;
		rows[i] = cells;
		i++;
	}
	var jsonRes = [{
					  "payload": {
					    "google": {
					      "expectUserResponse": true,
					      "richResponse": {
					        "items": [
					          {
					            "simpleResponse": {
					              "textToSpeech": simpleResponse
					            }
					          },
					          {
					            "tableCard": {
					              "title": "Paladins Stats",
					              "subtitle": rows[0].cells[0].text,
					              "image": {
					                "url": "https://avatars0.githubusercontent.com/u/23533486",
					                "accessibilityText": "Actions on Google"
					              },
					              "rows": rows,
					              "columnProperties": [
					                {
					                  "header": "Attribute",
					                  "horizontalAlignment": "CENTER"
					                },
					                {
					                  "header": "Value",
					                  "horizontalAlignment": "LEADING"
					                }
					              ]
					            }
					          }
					        ],
					        "suggestions":[
					                {
					                    "title": "Yes"
					                },
					                {
					                    "title": "No"
					                }
					          ]

					      },
					      "userStorage": "{\"data\":{}}"
					    },
					    "facebook": {
					      "text": fbResponse
					    }
					  }
					}];
		callback(jsonRes);
}
function getResponse(textResponse,fbResponse){
	var jsonRes = {
		"google": {
	        "expectUserResponse": true,
	        "richResponse": {
	            "items": [
	                {
	                    "simpleResponse": {
	                        "textToSpeech": textResponse
	                    }
	                }
	            ],
	            "suggestions": [
	                {
	                    "title": "Yes"
	                },
	                {
	                    "title": "No"
	                }
	            ]
	        }
	    },
	    "facebook": {
			"text": fbResponse
		}
	}
	return jsonRes;
}
exports.populateTable = populateTable;
exports.getResponse = getResponse;