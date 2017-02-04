var hueApi = new EzHue();
var debug = document.getElementById("debug");
var bridgeData = document.getElementById("bridge-data");
var lightData = document.getElementById("light-data");
var groupData = document.getElementById("group-data");
var whitelist = document.getElementById("whitelist");
function create(){
	hueApi.createBridge(function(){
		debug.innerHTML = "Press link button on bridge";
	}, function(){
		debug.innerHTML = "Failed to press link button in time, try again";
	}, function(bridge){
		debug.innerHTML = "Bridge created";
		bridgeData.innerHTML = JSON.stringify(bridge);
		bridge.getConfig(function(success, msg){
			if(success){
				whitelist.innerHTML = JSON.stringify(msg.whitelist);
			}
			else{
				whitelist.innerHTML = "Error : " + msg;
			}

		});
		
	});
}

function getLights(){
	hueApi.bridge.getLights(function(success, msg){
		if(success){
			lightData.innerHTML = JSON.stringify(hueApi.lights);
		}
		else{
			lightData.innerHTML = "Error : " + msg;
		}
	});
}

function getGroups(){
	hueApi.bridge.getGroups(function(success, msg){
		if(success){
			var groupTxt = document.getElementById("group-txt");
			groupTxt.innerHTML = JSON.stringify(hueApi.groups, null, '\n');
			groupData.innerHTML = "<button onclick='getGroupData()'>Get Action for " + hueApi.groups[0].name + "</button>";
		}
		else{
			groupData.innerHTML = "Error : " + msg;
		}
	});
}

function getGroupData(){
	hueApi.groups[0].getAction(function(success, msg){
		if(success){
			groupData.innerHTML += "\n" + JSON.stringify(hueApi.groups[0], null, '\t');
		}
		else{
			console.log(msg);
		}
	});
}

function whitelistReset(){
	console.log("purging whitelist");
	hueApi.bridge.resetWhitelist(function(success, msg){
		if(success){
			whitelist.innerHTML = JSON.stringify(hueApi.bridge.config.whitelist) + "<br />Users deleted : " + msg;
		}
	});
}