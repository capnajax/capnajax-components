var args = arguments[0] || {},
	shades = args.shades || 10,
	queueTasks = args.q && args.q == "true";

if(queueTasks) {
	var q = require('com.capnajax.faster').queueTask;
}

function pad(str, padChar, length) {
	if(str.length < length) {
		return pad(padChar+str, padChar, length);
	} else {
		return str;
	}
}

/**
 * This function here is to compare the difference between queueing tasks using the "faster" taskQueue and doing all
 * the tasks inline. 
 * @param {Object} fn the task
 */
function ex(fn) {
	Ti.API.debug("ex:queueTasks == " + (queueTasks?"true":"false"));
	if(queueTasks) {
		q.apply(this, arguments);
	} else {
		fn.apply(this, _.rest(arguments, 1));
	}
}

(function() {

	$.groupName.text = L("group."+args.group);

	var d100 = 100.0/(shades);

	var p = function(str) {return pad(str, '0', 2);};
	
	var drawColor = function(i, shades, colorsView, group) {
		
		for(var j = 0; j < shades; j++) {
			var c = 	p(Math.round(  			i			    *255.0/(shades-1)).toString(16)),
				antic = p(Math.round(((shades-1-j)+(i*j/shades))*255.0/(shades-1)).toString(16));
	
			var r = _(["r","y","m"]).contains(group) ? antic : c,
				g = _(["g","y","c"]).contains(group) ? antic : c,
				b = _(["b","c","m"]).contains(group) ? antic : c;
	
			var colorView = Ti.UI.createView({
				backgroundColor: "#"+r+g+b,
				top: (j*d100).toString()+"%",
				height: (d100+2).toString()+"%",
				left: (i*d100).toString()+"%",
				width: (d100+2).toString()+"%"
			});
	
			colorsView.add(colorView);
		}
	};

	var colorsView = Ti.UI.createView();

	for(var i = 0; i < shades; i++) {
		ex(drawColor, i, shades, colorsView, args.group);			
	}
	ex(function() {
		$.colors.add(colorsView);
	});

})();
