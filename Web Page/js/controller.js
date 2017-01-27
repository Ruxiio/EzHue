var currentColorType;
var bridgeNameInputLoaded = false;

//Color Type Handler
function updateColorType(type) {
	currentColorType = type;
	if(type == "hue"){
		hideElementWithId(["ct-input-feild", "xy-input-feild"]);
		showElementWithId("hue-input-feild");
	}
	else if(type == "ct"){
		hideElementWithId(["hue-input-feild", "xy-input-feild"]);
		showElementWithId("ct-input-feild");
	}
	else if(type == "xy"){
		hideElementWithId(["hue-input-feild", "ct-input-feild"]);
		showElementWithId("xy-input-feild");
	}
}

function renameBridge(button){

	if(bridgeNameInputLoaded){
		displayBridgeNameInput();
	}
	else{
		//Hide rename bridge button
		button.classList.add("hide");
		//Find input wrapper
		var inputWrapper = document.getElementById("rename-bridge-input");
		//Create the inputs label and the input box
		var inputLabel = document.createElement("h6");
		var divider = document.createElement("div");
		var input = document.createElement("input");
		//Add text to the label and append to show before the input
		inputLabel.classList.add("light");
		inputLabel.innerHTML = "New Name";
		inputWrapper.appendChild(inputLabel);
		divider.classList.add("divider");
		inputWrapper.appendChild(divider);
		//Add needed attributes to the input box and append to wrapper
		input.setAttribute("type", "text");
		input.setAttribute("id", "new-bridge-name");
		inputWrapper.appendChild(input);
		//Create wrapper for apply and cancel buttons
		//This is to make sure they are side by side
		var buttonWrapper = document.createElement("div");
		//Append button wrapper
		inputWrapper.appendChild(buttonWrapper);
		//Create apply and cancel buttons
		var apply = document.createElement("button");
		var cancel = document.createElement("button");
		//Apply class styling
		apply.classList.add("btn", "green", "waves-effect", "waves-light");
		apply.setAttribute("style", "margin-right:8px;");
		cancel.classList.add("btn", "red", "waves-effect", "waves-light");
		cancel.setAttribute("style", "margin-left:8px;");
		//Bind click events
		apply.onclick = function(){submitBridgeName()};
		cancel.onclick = function(){hideBridgeNameInput()};
		//Append Buttons to wrapper
		buttonWrapper.appendChild(apply);
		buttonWrapper.appendChild(cancel);
		//Create icons for buttons
		var applyIcon = document.createElement("i");
		var cancelIcon = document.createElement("i");
		//Add icon classes
		applyIcon.classList.add("fa", "fa-check");
		cancelIcon.classList.add("fa", "fa-times");
		//Append icons
		apply.appendChild(applyIcon);
		cancel.appendChild(cancelIcon);
	}

}

function submitBridgeName(){

	var newName = document.getElementById("new-bridge-name").value;

	//Add XML functionality later

	//Later add if HTTP Request completed
	var nameDisplay = document.getElementById("bridge-name");
	nameDisplay.innerHTML = newName;

	hideBridgeNameInput();
}

function hideBridgeNameInput(){
	if(!bridgeNameInputLoaded){
		bridgeNameInputLoaded = true;
	}

	var inputField = document.getElementById("rename-bridge-input");
	inputField.classList.add("hide");

	var inputBox = document.getElementById("new-bridge-name");
	inputBox.value = "";

	var renameButton = document.getElementById("rename-bridge-button");
	renameButton.classList.remove("hide");
}

function displayBridgeNameInput(){

	var renameButton = document.getElementById("rename-bridge-button");
	renameButton.classList.add("hide");

	var inputField = document.getElementById("rename-bridge-input");
	inputField.classList.remove("hide");

}

$(document).ready(function(){

	//Hue Slider
	var hueSlider = document.getElementById("hue-slider");
	var hueValueOutput = document.getElementById("hue-value");

	noUiSlider.create(hueSlider, {
		start: 127,
		step: 1,
		connect: [true, true],
		range: {
			'min' : [0],
			'50%' : [127],
			'max' : [255]
		},
	pips: { // Show a scale with the slider
		mode: 'range',
		density: 5
	},
	format: wNumb({
		decimals: 0
	})
	});

	hueSlider.noUiSlider.on('update', function(values, handle){
		hueValueOutput.innerHTML = values[handle];
	});
	
	//Brightness Slider//
	var briSlider = document.getElementById("bri-slider");
	var briValueOutput = document.getElementById("bri-value");
	
	noUiSlider.create(briSlider, {
		start: 50,
		step: 1,
		connect: [true, true],
		range: {
			'min' : [0],
			'50%' : [50],
			'max' : [100]
		},
		pips : {
			mode: 'range',
			density: 5
		},
		format: wNumb({
			decimals: 0
		})
	});

	briSlider.noUiSlider.on('update', function(values, handle){
		briValueOutput.innerHTML = values[handle];
	});
	
	//Saturation Slider
	var satSlider = document.getElementById("sat-slider");
	var satValueOutput = document.getElementById("sat-value");

	noUiSlider.create(satSlider, {
		start: 50,
		step: 1,
		connect: [true, true],
		range: {
			'min' : [0],
			'50%' : [50],
			'max' : [100]
		},
		pips: {
			mode: 'range',
			density: 5
		},
		format: wNumb({
			decimals: 0
		})
	});

	satSlider.noUiSlider.on('update', function(values, handle){
		satValueOutput.innerHTML = values[handle];
	});

	hueSlider.noUiSlider.on('slide', function(){updateColor();});
	satSlider.noUiSlider.on('slide', function(){updateColor();});

	//X Slider
	var xSlider = document.getElementById("x-slider");
	var xSliderValueOutput = document.getElementById("x-slider-value");

	noUiSlider.create(xSlider, {
		start: 0.5,
		connect: [true, true],
		range: {
			'min': [0],
			'max': [1]
		},
		pips: {
			mode: 'range',
			density: 5
		},
		format: wNumb({
			decimals: 2
		})
	});

	xSlider.noUiSlider.on('update', function(values, handle){
		xSliderValueOutput.innerHTML = values[handle];
	});

	//Y Slider
	var ySlider = document.getElementById("y-slider");
	var ySliderValueOutput = document.getElementById("y-slider-value");

	noUiSlider.create(ySlider, {
		start: 0.5,
		connect: [true, true],
		range: {
			'min': [0],
			'max': [1]
		},
		pips: {
			mode: 'range',
			density: 5
		},
		format: wNumb({
			decimals: 2
		})
	});

	ySlider.noUiSlider.on('update', function(values, handle){
		ySliderValueOutput.innerHTML = values[handle];
	});

	//Brightness Slider For XY
	var briXYSlider = document.getElementById("bri-slider-xy");
	var briXYValueOutput = document.getElementById("bri-value-xy");

	noUiSlider.create(briXYSlider, {
		start: 50,
		step: 1,
		connect: [true, true],
		range: {
			'min' : [0],
			'max' : [255]
		},
		pips : {
			mode: "range",
			density : 5
		}
	});

	briXYSlider.noUiSlider.on('update', function(values, handle){
		briXYValueOutput.innerHTML = values[handle];
	});

	xSlider.noUiSlider.on('slide', function(){updateColor();});
	ySlider.noUiSlider.on('slide', function(){updateColor();});
	briXYSlider.noUiSlider.on('slide', function(){updateColor();});

	//Update Slider Colors
	function updateColor()
	{
		if(currentColorType == "hue"){
			color = "hsl(" + hueSlider.noUiSlider.get() + 
			", " + satSlider.noUiSlider.get() + 
			"%, 50%)";

			var hueStyle = hueSlider.getElementsByClassName("noUi-connect");
			var satStyle = satSlider.getElementsByClassName("noUi-connect");

			for(var i = 0; i < 2; i++)
			{
				for(var j = 0; j < 2; j++)
				{
					switch(i){
						case 0:
						hueStyle[j].setAttribute("style", "background:" + color);
						break;
						case 1:
						satStyle[j].setAttribute("style", "background:" + color);
						break;
					}
				}
			}

		}
		else if(currentColorType == "ct"){

		}
		else if(currentColorType == "xy"){


		}

	}
	
});



//////////////////////
// HELPER FUNCTIONS //
//////////////////////

//Hide Element With A Certian ID
function hideElementWithId(id){
	console.log("hiding");
	if(typeof id === "string"){
		var tmp = document.getElementById(id);

		if(typeof tmp !== "undefined" && tmp != null){
			tmp.classList.add("hide");
		} 
		else{
			return;
		}
	}
	else if(typeof id === "object"){
		var validIds = [];
		for(var i = 0; i < id.length; i++){
			if(typeof id[i] === "string"){
				validIds.push(id[i]);
			}
		}

		if(validIds.length >= 1){
			for(var i = 0; i < validIds.length; i++){
				var tmp = document.getElementById(validIds[i]);

				if(tmp !== "undefined" && tmp != null){
					tmp.classList.add("hide");
				}
				else{
					return;
				}
			}
		}
	}
}

//Hide all elements with an id
function hideAllElementsWithId(id){
	if(typeof id === "string"){
		var tmp = document.getElementsById(id);
		for(var i = 0; i < tmp.length; i++)
		{
			if(typeof tmp[i] !== "undefined" && tmp != null){
				tmp.classList.add("hide");
			}
			else {
				continue;
			}
		}
	}
	else if(typeof id === Array){
		var tmp;
		for(var i = 0; i < id.length; i++){
			tmp = document.getElementsById(id[i]);
			for(var j = 0; j < tmp.length; j++){
				tmp.classList.add("hide");
			}
		}
	}
}

//Show an element with an id
function showElementWithId(id){

	if(typeof id === "string"){
		var tmp = document.getElementById(id);

		if(typeof tmp !== "undefined" && tmp != null){
			tmp.classList.remove("hide");
		} 
		else{
			return;
		}
	}
	else if(typeof id === Array){
		var validIds = [];
		for(var i = 0; i < id.length; i++){
			if(typeof id[i] === "string"){
				validIds.push(id[i]);
			}
		}

		if(validIds.length >= 1){
			for(var i = 0; i < validIds.length; i++){
				var tmp = document.getElementById(validIds[i]);

				if(tmp !== "undefined" && tmp != null){
					tmp.classList.remove("hide");
				}
				else{
					return;
				}
			}
		}
	}
}