function EzHue(){
	//HTTP variables
	var http = new XMLHttpRequest();
	var response;
	var localEnabled = (typeof(Storage) !== "undefined");
	var useLocal = localEnabled;

	this.groupClasses = {
		livingroom:"Living room",
		kitchen:"Kitchen",
		dining:"Dining",
		bedroom:"Bedroom",
		kids:"Kids bedroom",
		bath:"Bathroom",
		nursery:"Nursery",
		rec:"Recreation",
		office:"Office",
		gym:"Gym",
		hall:"Hallway",
		toilet:"Toilet",
		front:"Front door",
		garage:"Garage",
		terrace:"Terrace",
		garden:"Garden",
		drive:"Driveway",
		carport:"Carport",
		other:"Other"
	};
	//Refrence to api object
	var api = this;

	//Bridge instance
	this.bridge = {};

	//Lights array
	this.lights = [];

	//Groups array
	this.groups = [];

	//Find and create new bridge  //Tested
	this.createBridge = function(alert, cb){
		//Bridge frame
		var bridgeFrame = {
			ip:"",
			url:"",
			username:"",
			name:"",
			config:{}
		}

		findBridge();
	
		//Find bridge with HUE nupnp
		function findBridge(){
			http.onreadystatechange = function(){
				//Waits for HTTP success
				if(requestStatus(http)){
					//Stores response object
					response = JSON.parse(http.responseText);
					console.log(response[0]);
					//Stores bridge IP
					bridgeFrame.ip = response[0].internalipaddress;
					//Generates bridge url
					bridgeFrame.url = "http://" + bridgeFrame.ip + "/api";
					//Generates bridge username
					generateUsername(bridgeFrame.url);
				}
				else if(http.readyState == 4){
					//Handle errors
				}
			}
			//Prepare HTTP request
			http.open('GET', "https://www.meethue.com/api/nupnp" , true);
			//Send request
			http.send();
		}

		function generateUsername(url){
			//Sends POST request
			request();
			var isFirst = true;
			http.onreadystatechange = function(){
				//Waits for the HTTP to success
				if (requestStatus(http)) {
					//Stores response object
					response = JSON.parse(http.responseText);
					console.log(response[0]);
					if("error" in response[0]){
						//Handle possible errors
						switch(response[0].error.type){
							//If the link button was not pressed
							case 101:
								//Wait 15 seconds to resend request
								if(isFirst){
									window.setTimeout(function(){request();}, 15000);
									isFirst = false;
								}
								else{
									cb(false, "Link button not pressed in time");
								}
								break;
						}
					}
					else if("success" in response[0]){
						//Successful connection to the bridge
						//Stores bridge username
						bridgeFrame.username = response[0].success.username;
						//Generates url with username
						bridgeFrame.url += "/" + bridgeFrame.username;
						//Gets name from bridge config
						findBridgeName();
					}
				}
				else if(http.readyState == 4){
					//Handle errors
				}
			}

			//Post request function for multiple calls
			function request(){
				alert(bridgeFrame.ip);
				//Prepares HTTP request
				http.open('POST', url, true);
				//Sends HTTP request
				http.send("{\"devicetype\":\"Rux Lights\"}");
			}
		}

		function findBridgeName(){
			console.log("finding bridge name");
			http.onreadystatechange = function(){
				if(requestStatus(http)){
					//Stores response object
					response = JSON.parse(http.responseText);
					console.log(response.name);
					//Stores bridge name
					bridgeFrame.name = response.name;
					//Stores bridge config data
					bridgeFrame.config = response;
					//Applies bridge frame to bridge object
					initBridge();
				}
				else if(http.readyState == 4){
					//Handle errors
				}
			}
			//Prepares HTTP request
			http.open("GET", bridgeFrame.url + "/config" , true);
			//Sends HTTP request
			http.send();
		}

		function initBridge(){
			//Create bridge as an object of EzHue
			api.bridge = new Bridge(bridgeFrame, api);
			//If local storage is supported, store bridge data for later use
			if(localEnabled){
				localStorage.url = api.bridge.url;
				localStorage.ip = api.bridge.ip;
				localStorage.username = api.bridge.username;
			}
			//Fires the success function
			cb(true);
		}
	}

	//Find locally stored bridge //Tested
	this.findExistingBridge = function(cb){
		//Bridge frame
		var bridgeFrame = {
			ip:"",
			url:"",
			username:"",
			name:"",
			config:{}
		}
		if(localEnabled){
			if(localStorage.url !== "undefined"){
				http.onreadystatechange = function(){
					if(requestStatus(http)){
						//Stores respinse object
						response = JSON.parse(http.responseText);
						console.log(response);
						//If a successful request was sent the bridge is valid and can be used
						if("lights" in response){
							console.log("url found and valid");
							var tmpUrl = localStorage.url;
							//If the username was undefined, pull from url
							if(localStorage.username === "undefined"){
								var _username = "";
								//Decrement from end of url untill hitting a "/"
								for(var i = tmpUrl.length; i > 0; i--){
									if(tmpUrl[i] != "/"){
										//Add character to string
										_username += tmpUrl[i];
									}
									else{
										//Break the loop when / is found
										break;
									}
								}
								//Reverse username string and store it
								localStorage.username = _username.split("").reverse().join("");
							}
							//If the ip was undefined, pull from url
							if(localStorage.ip === "undefined"){
								var _ip = "";
								//Loop through url after http:// and before next / to extract ip
								for(var i = 7; i < tmpUrl.length; i++)
								{
									if(tmpUrl[i] != "/"){
										_ip += tmpUrl[i];
									}
									else{
										//Break the loop because / was found
										break;
									}
								}
								//Store extracted ip
								localStorage.ip = _ip;
							}
							bridgeFrame.ip = localStorage.ip;
							bridgeFrame.url = localStorage.url;
							bridgeFrame.username = localStorage.username;
							findBridgeName();
						}
						else{
							//Abandon localStorage and find new bridge
							console.log("url found but not valid");
							cb(false);
						}
					}
				}
				//Prepares HTTP request
				http.open('GET', localStorage.url, true);
				//Handles possible timeout due to IP change
				http.timeout = 5000;
				http.ontimeout = function(){cb(false, "HTTP connection timed out!");useLocal = false;}
				//Sends HTTP request
				http.send();
			}
		}
		else{
			cb(false, "Local storage not enabled in this browser");
		}

		function findBridgeName(){
			console.log("finding bridge name");
			http.onreadystatechange = function(){
				if(requestStatus(http)){
					//Stores response object
					response = JSON.parse(http.responseText);
					console.log(response.name);
					//Stores bridge name
					bridgeFrame.name = response.name;
					//Stores bridge config data
					bridgeFrame.config = response;
					//Applies bridge frame to bridge object
					initBridge();
				}
				else if(http.readyState == 4){
					//Handle errors
				}
			}
			//Prepares HTTP request
			http.open("GET", bridgeFrame.url + "/config" , true);
			//Sends HTTP request
			http.send();
		}

		function initBridge(){
			//Create bridge as an object of EzHue
			api.bridge = new Bridge(bridgeFrame, api);
			//If local storage is supported, store bridge data for later use
			if(useLocal){
				localStorage.url = api.bridge.url;
				localStorage.ip = api.bridge.ip;
				localStorage.username = api.bridge.username;
			}
			//Fires the success function
			cb(true);
		}
	}

	//Bridge object constructor
	function Bridge(frame){
		//Sets bridge variables
		this.ip = frame.ip;
		this.username = frame.username;
		this.name = frame.name;
		this.url = frame.url;
		this.lastScan;
		this.config;

		//Finds all lights connected to bridge //Tested
		this.getLights = function(cb){
			//Resets current lights
			api.lights = [];
			http.onreadystatechange = function(){
				if(requestStatus(http)){	
					//Stores response object
					response = JSON.parse(http.responseText);
					//Determine amount of lights connected
					var lightCount = Object.keys(response).length;
					//Cycle through lights
					var _index = 1;
					for (var i = 0; i < lightCount; i++){
						//Prepare light
						var curr = response[Object.keys(response)[i]];
						//Create light object
						var tmp = new Light(curr.name, curr.type, curr.state, _index);
						//Add light to array
						api.lights.push(tmp);
						//Increment index tracker
						_index++;
						//If this is the final itteration fire the completion callback
						if(i == lightCount - 1){
							cb(true);
						}
					}
				}
				else if(http.readyState == 4){
					//Handle errors
					cb(false, "An HTTP error has occured");
				}
			}
			//Prepare HTTP request
			http.open('GET', this.url + "/lights", true);
			//Send HTTP request
			http.send();
		}

		//Finds and adds new lights that are not connected to the bridge
		//Update and complete variables are callback functions
		this.searchForLights = function(update, complete){
			http.onreadystatechange = function(){
				if(requestStatus(http)){
					//Stores response object
					response = JSON.parse(http.responseText);
					if("success" in response){
						monitorProgress(this);
					}
				}
				else if(http.readyState == 4){
					//Handle Errors
					cb(false, "An HTTP error has occured");
				}
			}

			//Prepare HTTP request
			http.open('POST', this.url + "/lights", true);
			//Send HTTP request
			http.send();

			function monitorProgress(_bridge){
				//Array representing the index of new lights
				var newLights = [];
				//Should I update lastScan?
				var firstResponse = true;
				//Creates update interval (1 update per second)
				var send = window.setInterval(function(){
					//Length will always be atleast 1
					var lastLen = 1;
					http.onreadystatechange = function(){
						if(requestStatus(http)){
							//Stores response object
							response = JSON.parse(http.responseText);
							//Stores length of response
							var rLen = Object.keys(response);
							//Stores last scan object if first call
							if(firstResponse){
								//If only the last scan was returned
								if(rLen == 1){_bridge.lastScan = response[0];}
								//If more than thw last scan was returned
								else{_bridge.lastScan = response[rLen - 1];}
								//Ignore lastscan object for the remaining loops
								firstResponse = false;
							}
							if(rLen > 1 && rLen > lastLen){
								//Loops through response object (ignores lastscan)
								for(var i = lastLen - 1; i < rLen - 1; i++){
									//Adds new lights to placeholder
									newLights.push(Object.keys(response[i]));
								}
								//Sets to ignore lights that have already been added
								lastLen = rLen;
							}
							//Fires status update callback
							update(newLights);
						}
						else if(http.readyState == 4){
							//Handle errors
							cb(false, "An HTTP error has occured");
						}
					}
					//Prepares HTTP request
					http.open('GET', _bridge.url + "/lights/new", true);
					//Sends HTTP request
					http.send();
				}, 1000);
				//Timer to clear interval after light search is complete (40 sec)
				window.setTimeout(function(){
					set.clearInterval();
					collectResults(_bridge, newLights, lastScan);
				}, 40000);
			}

			function collectResults(_bridge, newLights, lastScan){
				var result;
				http.onreadystatechange = function(){
					if(requestStatus(http)){
						//Stores response object
						response = JSON.parse(http.responseText);

						//Collects extended light data of the new lights
						for(var i = response.length - newLights.length; i < response.length; i++){
							result.push(response[i]);
						}
						//Fires callback to handle search completion
						complete(result);
						//Resets the current light set in the case of
						//lights being removed
						_bridge.findLights();
					}
					else if(http.readyState == 4){
						//Handle errors
						cb(false, "An HTTP error has occured");
					}
				}

				//Prepare HTTP request
				http.open('GET', _bridge.url + "/lights", true);
				//Sends HTTP request
				http.send();
			}
		}

		//Deletes light from bridge
		this.deleteLight = function(index, cb){
			//Checks to see if light exists
			if(api.lights[index] === "undefined" || api.lights[index] == null){
				return;
			}

			http.onreadystatechange = function(){
				if(requestStatus(http)){
					//Refreshes the light list
					this.findLights();
					//Fires callback
					cb(true);
				}
				else if(http.readyState == 4){
					//Handle errors
					cb(false, "An HTTP error has occured");
				}
			}

			//Prepares HTTP request
			http.open("DELETE", this.url + "/lights/" + index, true);
			//Sends HTTP request
			http.send();
		}

		//Renames the bridge
		this.rename = function(n, cb){
			console.log("renaming bridge");
			//Temp reference to bridge
			var _s = this;
			//Checks if the new name is a valid string
			if(typeof(n) !== "string"){
				//Fires error callback and ends function
				cb(false, "String must be provided as first variable");
				return;
			}

			http.onreadystatechange = function(){
				if(requestStatus(http)){
					//Stores response object
					response = JSON.parse(http.responseText);
					//Looks for success of error objects
					if("success" in response[0])
					{
						//Sets bridge name in internal memory
						_s.name = n;
						//Runs successful callback
						cb(true, "Bridge name successfuly changed to : " + n);
					}
					else if("error" in response[0]){
						//Fires error callback with response data
						cb(false, response[0]);
					}
				}
				//HTTP request finished but not successful
				else if(http.readyState == 4){
					//Fires error callback
					cb(false, "HTTP request encountered an error.");
				}
			}

			//Prepares HTTP request
			http.open("PUT", this.url + "/config", true);
			//Sends HTTP request
			http.send(JSON.stringify({"name":n}));
		}

		//Gets the bridge config data //Tested
		this.getConfig = function(cb){
			//Temp refrence to bridge
			var _s = this;

			http.onreadystatechange = function(){
				if(requestStatus(http)){
					//Stores response variable
					response = JSON.parse(http.responseText);
					//Adds config data to bridge
					_s.config = response;
					//Fires callback with response data
					cb(true, _s.config);
				}
				else if(http.readyState == 4){
					//Handle errors
					cb(false, "An HTTP error has occured");
				}
			}

			//Prepare HTTP request
			http.open('GET', this.url + "/config", true);
			//Send HTTP request
			http.send();
		}

		//Removes a user from the whitelist
		this.deleteUser = function(username, cb){
			//Temp reference to bridge
			var _s = this;

			http.onreadystatechange = function(){
				if(requestStatus(http)){
					//Stores response object
					response = JSON.parse(http.responseText);
					//Assures request was a success
					if("success" in response){
						//Removes the username from local whitelist
						delete _s.config.whitelist[username];
						//Fires callback
						cb(true);
					}
					else{
						//Handle errors
						cb(false, "The bridge has returned an error");
					}
				}
				else if(http.readyState == 4){
					//Handle errors
					cb(false, "An HTTP error has occured");
				}
			}

			for(var i = 0; i < this.config.whitelist.length; i++){
				if(this.config.whitelist[i] == username){
					//Prepare HTTP request
					http.open('DELETE', this.url + "/config/whitelist/" + uesrname, true);
					//Send HTTP request
					http.send();
					break;
				}
			}
		}

		//Removes all users from the whitelist excluding this user //Tested
		this.resetWhitelist = function(cb){
			//Stores successes and errors to send to the callback
			var log = [];
			var deletedUsers = [];
			var userQueue = [];
			var users = Object.keys(this.config.whitelist);
			//Loops through all users
			for(var i in users){
				//Checks if the current user is this user
				if(users[i] !=  this.username){
					userQueue.push(users[i]);
				}
				if(i == users.length - 1){
					beginQueue();
				}
			}
			function beginQueue(){
				//Clears queue interval
				function clearInt(){
					window.clearInterval(int);
						api.bridge.getConfig(function(success, msg){
							if(success){
								console.log("Config successfuly updated");
							}
						});
					cb(true, log);
				}
				setTimeout(function(){clearInt();}, 75 * (users.length - 1) + 50);
				var _index = userQueue.length;
				//Begins a queue that cycles through
				var int = window.setInterval(function(){
					http.onreadystatechange = function(){
						if(requestStatus(http)){
							//Stores response object
							response = JSON.parse(http.responseText);
							if("success" in response[0]){
								log.push({"success":"User : " + users[i] + " deleted"});
								//Adds username to the deleted user list
								deletedUsers.push(users[i]);
								console.log("User Deleted");
							}
							else{
								console.log("error - " + response);
							}
						}
						else if(http.readyState == 4){
							log.push({"error":"HTTP error has occured when deleting user : " + users[i]});
						}
					}

					if(_index != 0){
						_index--;
					}

					//Prepares HTTP request
					http.open('DELETE', api.bridge.url + "/config/whitelist/" + users[_index], true);
					//Sends HTTP request
					http.send();
				}, 75);
			}
		}

		//Finds groups on the bridge //Tested
		this.getGroups = function(cb){

			http.onreadystatechange = function(){
				if(requestStatus(http)){
					//Stores response object
					response = JSON.parse(http.responseText);
					api.groups = [];
					//Loops through returned groups
					for(i in response){
						//Short hand for current group
						var _curr = response[i];
						//Adds group to group array
						api.groups.push(new Group(_curr.name, i.toString(), _curr.type, _curr.lights));
					}
					cb(true);
				}
				else if(http.readyState == 4){
					//Fires Callback
					cb(false, "An HTTP error has occured");
				}
			}

			//Prepares HTTP request
			http.open('GET', this.url + "/groups", true);
			//Sends the HTTP request
			http.send();
		}

		//Creates a new group on the bridge
		this.createGroup = function(name, type, _class, lights, cb){
			//Holder for lights that exist on bridge
			var validLights = [];

			//Checks valid type
			if(type != "LightGroup" || type != "Room"){
				cb(false, "Must select a valid class for group creation");
				return;
			}
			//Checks valid class
			for(i in this.groupClasses){
				if(_class == this.groupClasses[i]){
					break;
				}
				else if(i == this.groupClasses.length){
					cb(false, "Must enter a valid class for group creation");
					return;
				}
			}
			//Checks lights
			if(!Array.isArray(lights)){
				cb(false, "Must pass in an array for the lights variable");
				return;
			}
			else{
				//Loops through lights to be in group
				for(i in lights){
					//Loops through existing lights
					for(j in api.lights){
						if(lights[i] == api.lights[j].index){
							//If light exists, add to valid list and move to next light
							validLights.push(lights[i]);
							break;
						}
					}
				}
			}

			//Prepares request object
			var requestBody = {
				"name":name,
				"type":type,
				"class":_class,
				"lights":validLights
			}

			http.onreadystatechange = function(){
				if(requestStatus(http)){
					//Stores response object
					response = JSON.parse(http.responseText);
					if("success" in response){
						//Creates group object
						api.groups.push(requestBody.name, response.success.id, requestBody.type, requestBody._class, requestBody.lights);
						cb(true);
					}
				}
				else if(http.readyState == 4){
					cb(false, "An HTTP error has occured")
				}
			}

			//Prepare HTTP request
			http.open('POST', api.bridge.url + "/groups", true)
			//Send HTTP request
			http.send(requestBody);
		}

		//Deletes a group from the bridge
		this.deleteGroup = function(id, cb){
			//Checks if the group exists and stores array index of deleted group
			var _index;
			for(i in api.groups){
				if(id == api.groups[i].id){
					_index = i;
					break;
				}
				else if(i == api.groups.length){
					//Fires Callback
					cb(false, "Group does not exist");
				}
			}

			http.onreadystatechange = function(){
				if(requestStatus(http)){
					//Stores response object
					response = JSON.parse(http.responseText);

					if("success" in response[0]){
						//Removes group from api array
						api.groups.splice(_index, 1);
						//Fires Callback
						cb(true);
					}
					else{
						//Fires Callback
						cb(false, "A bridge error has occured");
					}

				}
				else if(http.readyState == 4){
					//Fires Callback
					cb(false, "An HTTP error has occured");
				}
			}

			//Prepares HTTP request
			http.open('DELETE', this.url + "/groups/" + id, true);
			//Sends HTTP request
			http.send();
		}
	}

	//Light object constructor
	function Light(name, type, state, index){
		this.name = name;
		this.type = type;
		this.state = state;
		this.index = index;

		//Sends a new state to the bridge
		this.sendState = function(bridge, nState, cb){

			var nStateKeys = Object.keys(nState);
			var stateKeys = Object.keys(this.state);
			var requestBody = "{";

			//Preparing body message
			for(var i in nStateKeys){
				//Looping through values in the new state
				for(var j in stateKeys){
					//Looping through the values in the current state
					//This ensures we are only sending updated items to the bridge
					if(nStateKeys[i] == stateKeys[j]){
						//Checks if the value of the matching keys matches
						if(nState[nStateKeys[i]] != this.state[stateKeys[j]]){
							//Checks if xy
							if(nStateKeys[i] == "xy"){
								//Makes sure the xy values are different than the current state
								if(nState.xy[0] != this.state.xy[0] || nState.xy[1] != this.state.xy[1]){
									//Adds the xy array to the request body
									requestBody += '"' + nStateKeys[i] + '":[' + nState["xy"][0] + "," + nState["xy"][1] + "],";
								}
							}
							else{
								//Adds key to request body
								requestBody += '"' + nStateKeys[i] + '":';
								//Checks if key value needs to be a string
								if(nStateKeys[i] == "colormode" || nStateKeys[i] == "alert" || nStateKeys[i] == "effect"){
									//Wraps the key value in string notation
									requestBody += '"' + nState[nStateKeys[i]] + '",';
								}
								else{
									//Adds the key value to the request body
									requestBody += nState[nStateKeys[i]] + ",";
								}
							}
						}
					}
				}
			}

			//Removes last comma from body and adds closing brace
			var index = requestBody.length - 1;
			var tmp = requestBody.substring(0, index);
			requestBody = tmp + "}";

			http.onreadystatechange = function(){
				if(requestStatus(http)){
					//Stores response object
					response = JSON.parse(http.responseText);
					if("success" in response){
						//Applying new state to light object
						for(var i in nStateKeys){
							//Looping through values in the new state
							for(var j in stateKeys){
								//Looping through the values in the current state
								if(nStateKeys[i] == stateKeys[j]){
									//Overwrites the previous state with the new state value
									this.state[stateKeys[j]] = nState[nStateKeys[i]];
								}
							}
						}
						cb(true);
					}
					else{
						//Bridge error
						cb(false, "The bridge has returned an error");
					}

				}
				else if(http.readyState == 4){
					//HTTP error
					cb(false, "An HTTP error has occured");
				}
			}


			//Prepare HTTP request
			http.open('PUT', bridge.url + "/lights/" + this.index, true);
			//Sends HTTP request
			http.send(requestBody);
		}

		//Renames the light
		this.rename = function(name, cb){
			//Temp refrence to light
			var _s = this;
			http.onreadystatechange = function(){
				if(requestStatus(http)){
					//Stores response object
					response = JSON.parse(http.responseText);
					if("success" in response){
						//Update light objects name
						_s.name = name;
						//Fires callback function
						cb(true);
					}
					else{
						//Handle errors
						cb(false, "The bridge has returned an error");
					}
				}
				else if(http.readyState == 4){
					//Handle errors
					cb(false, "An HTTP error has occured");
				}
			}

			//Prepare HTTP request
			http.open('PUT', api.bridge.url + "/lights/" + this.index, true);
			//Send HTTP request
			http.send(JSON.stringify({"name":name}));
		}
	}

	//Group object constructor
	function Group(name, id, type, lights){
		this.name = name;
		this.id = id;
		this.type = type;
		this.class;
		this.lights = lights;
		this.action;
		this.state;
		var thisGroup = this;
		//Gets the groups current action data //Tested
		function getGroupActionData(){
			http.onreadystatechange = function(){
				if(requestStatus(http)){
					//Stores response object
					response = JSON.parse(http.responseText);

					thisGroup.action = response.action;
					thisGroup.state = response.state;
					thisGroup.class = response.class;
				}
				else if(http.readyState == 4){
					//HTTP error
				}
			}

			//Prepare HTTP request
			http.open('GET', api.bridge.url + "/groups/" + this.id, true);
			//Send HTTP request
			http.send();
		}

		//Loads the groups data on creation if not provided
		getGroupActionData();

		//Stores the time the group was last updated
		this.lastUpdate = 0;

		//Renames the group
		this.rename = function(name, cb){

			if(typeof(name) != string || name.length < 2){
				//Fires Callback
				cb(false, "The name given is not valid");
				//Exit the function
				return;
			}

			http.onreadystatechange = function(){
				if(requestStatus(http)){
					//Stores response object
					response = JSON.parse(http.responseText);

					if("success" in response){
						//Updated the group name
						this.name = name;
						//Fires Callback
						cb(true);
					}
					else{
						//Fires Callback
						cb(false, "A bridge error has occured");
					}
				}
				else if(http.readyState == 4){
					//Fires Callback
					cb(false, "An HTTP error occured");
				}
			}

			//Prepare HTTP request
			http.open('PUT', api.bridge.url + "/groups/" + this.id, true);
			//Send HTTP request
			http.send(JSON.stringify({"name":name}));
		}

		//Adds a light to the group
		this.addLights = function(light, cb){

			var log = {
				"successful":[],
				"failed":[]
			}

			//Verifies lights input is an array with atleast 1 value
			if(!Array.isArray(lights)){
				cb(false, "Must input an array to add/remove light(s) from a group");
				return;
			}
			else if(lights < 1){
				cb(false, "Lights array was empty");
			}

			requestBody = this.lights;

			//Checks if the light exists on the bridge
			for(i in lights){
				//Checks if light is already in group
				if(this.lights.indexOf(lights[i]) != -1){
					//Light already exists in group
					log.failed.push(lights[i]);
				}
				else{
					for(j in api.lights){
						if(lights[i] == api.lights[j].id){
							//Adds light to the request
							requestBody.push(lights[i]);
							//Adds light to success list
							log.successful.push(lights[i]);
						}
					}
				}
			}

			http.onreadystatechange = function(){
				if(requestStatus(http)){
					//Stores response object
					response = JSON.parse(http.responseText);
					if("success" in response){
						//Adds light id to group
						this.lights = requestBody;
						cb(true, log);
					}
					else{
						cb(false, "A bridge error occured");
					}
				}
				else if(http.readyState == 4){
					cb(false, "An HTTP error occured");
				}
			}

			//Prepares HTTP request
			http.open('PUT', api.bridge.url + "/groups/" + this.id, true);
			//Sends HTTP request
			http.send({"lights":requestBody});
		}

		//Removes a light from the group
		this.removeLights = function(lights, cb){
			var log = {
				"successful":[],
				"failed":[]
			}

			//Verifies lights input is an array with atleast 1 value
			if(!Array.isArray(lights)){
				cb(false, "Must input an array to add/remove light(s) from a group");
				return;
			}
			else if(lights < 1){
				cb(false, "Lights array was empty");
			}

			requestBody = this.lights;

			//Checks that the light exists
			for(i in lights){
				for(j in this.lights){
					if(this.lights[j] == lights[i]){
						//Removes the light from the groups light array 
						requestBody.splice(j, 1);
						//Adds light to the success list
						log.successful.push(lights[i])
						break;
					}
					else if(j == this.lights.length){
						//Adds light to the fail list
						log.failed.push(lights[i]);
					}
				}
			}

			http.onreadystatechange = function(){
				if(requestStatus(http)){
					//Stores reaponse object
					response = JSON.parse(http.responseText);

					if("success" in response[0]){
						//Sets the light array to the new light set
						this.lights = requestBody;
						cb(true, log);
					}
					else{
						cb(false, "A bridge error has occured");
					}
				}
				else if(http.readyState == 4){
					cb(false, "An HTTP error has occured");
				}
			}

			//Prepares HTTP Request
			http.open('PUT', api.bridge.url + "/groups/" + this.id, true);
			http.send({"lights":requestBody});
		}

		//Updates the state of all lights in the group
		this.sendAction = function(nAction, cb){
			var nActionKeys = Object.keys(nAction);
			var actionKeys = Object.keys(this.action);
			var requestBody = "{";
			var time = new Date();

			//Limits group updating to 1 per second
			if(time.now() < this.lastUpdate + 100){
				cb(false, "Must wait 1 second before sending another group update");
				return;
			}

			//Preparing body message
			for(var i in nActionKeys){
				//Looping through values in the new action
				for(var j in actionKeys){
					//Looping through the values in the current action
					//This ensures we are only sending updated items to the bridge
					if(nActionKeys[i] == actionKeys[j]){
						//Checks if the value of the matching keys matches
						if(nAction[nActionKeys[i]] != this.action[actionKeys[j]]){
							//Checks if xy
							if(nActionKeys[i] == "xy"){
								//Makes sure the xy values are different than the current action
								if(nAction.xy[0] != this.action.xy[0] || nAction.xy[1] != this.action.xy[1]){
									//Adds the xy array to the request body
									requestBody += '"' + nActionKeys[i] + '":[' + nAction["xy"][0] + "," + nAction["xy"][1] + "],";
								}
							}
							else{
								//Adds key to request body
								requestBody += '"' + nActionKeys[i] + '":';
								//Checks if key value needs to be a string
								if(nActionKeys[i] == "colormode" || nActionKeys[i] == "alert" || nActionKeys[i] == "effect"){
									//Wraps the key value in string notation
									requestBody += '"' + nAction[nActionKeys[i]] + '",';
								}
								else{
									//Adds the key value to the request body
									requestBody += nAction[nActionKeys[i]] + ",";
								}
							}
						}
					}
				}
			}

			//Removes last comma from body and adds closing brace
			var index = requestBody.length - 1;
			var tmp = requestBody.substring(0, index);
			requestBody = tmp + "}";

			http.onreadyactionchange = function(){
				if(requestStatus(http)){
					//Stores response object
					response = JSON.parse(http.responseText);
					if("success" in response){
						//Applying new action to light object
						for(var i in nActionKeys){
							//Looping through values in the new action
							for(var j in actionKeys){
								//Looping through the values in the current action
								if(nActionKeys[i] == actionKeys[j]){
									//Overwrites the previous action with the new action value
									this.action[actionKeys[j]] = nAction[nActionKeys[i]];
								}
							}
						}
						this.lastUpdate = time.now();
						cb(true);
					}
					else{
						//Bridge error
						cb(false, "The bridge has returned an error");
					}

				}
				else if(http.readyaction == 4){
					//HTTP error
					cb(false, "An HTTP error occured");
				}
			}


			//Prepare HTTP request
			http.open('PUT', api.bridge.url + "/lights/" + this.index, true);
			//Sends HTTP request
			http.send(requestBody);
		}

		//Finds the state of one light in the group //Tested
		this.getAction = function(cb){

			http.onreadystatechange = function(){
				if(requestStatus(http)){
					//Stores response object
					response = JSON.parse(http.responseText);
					console.log(response);
					thisGroup.action = response.action;
					thisGroup.state = response.state;
					console.log(thisGroup);
					cb(true);
				}
				else if(http.readyState == 4){
					cb(false, "An HTTP error occured");
				}
			}

			//Prepare HTTP request
			http.open('GET', api.bridge.url + "/groups/" + this.id, true);
			//Send HTTP request
			http.send();
		}
	}
}

//Helper function for http requests
function requestStatus(http){
	if(http.readyState != 4){return false;}
	if(http.status == 200){return true;}
	else {return false;}
}