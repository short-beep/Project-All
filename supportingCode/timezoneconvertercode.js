/* Written in JS with JQUERY first */

/* Declare eval separately so the rest can be mimified and obfuscated */
var wtb_widget_1714718689 = {
	ev: function(expr) { return eval(expr); }
};

// Create a global object but keep it random to handle multiple widget on the same page
(function() {

	// Set a unique name for it
	var widgetObjName = 'wtbeventwidget_' + Math.floor(Math.random() * 99999);
	var widgetObjCss  = 'wtbeventwidget_css';

	var widgetUrl   = 'https://www.worldtimebuddy.com/clock_frame?h=3202781|U2xvdmVuaWE=&wt=c2&ap=[TF]';
	var clockWidget = 'c2'.match(/c\d/) != null;	
	var deltaYear   = 365 * 24 * 60 * 60 * 1000;
	var deltaMonth  =  30 * 24 * 60 * 60 * 1000;	
	var deltaDay    =       24 * 60 * 60 * 1000;	
	var deltaHour   =            60 * 60 * 1000;
	var deltaMinute =                 60 * 1000;
	
	var interval_id = null;
	var last_hash   = '';
	var form        = null;
	var dt_input    = null;
	var url_input   = null;

	/*!
	 * Part of this script uses: 
	 * Cross-browser JSON Serialization in JavaScript by Craig Buckler from
	 * http://www.sitepoint.com/javascript-json-serialization/
	 */
	var JSON = JSON || {};
	JSON.stringify = JSON.stringify || function (obj) {
		var t = typeof (obj);
		if (t != "object" || obj === null) {
			// simple data type
			if (t == "string") obj = '"'+obj+'"';
			return String(obj);
		}
		else {
			// recurse array or object
			// SR: has to split the for (n in obj) loop into two because whenever Array.prototype is modified, it picked up the functions (bah!!!) 
			var n, v, json = [], arr = (obj && obj.constructor == Array);
			var loopBody = function(n, v) {
					t = typeof(v);
					if (t == "string") v = '"'+v+'"';
					else if (t == "object" && v !== null) v = JSON.stringify(v);
					json.push((arr ? "" : '"' + n + '":') + String(v));
			};
			if (obj instanceof Array) {
				for (var i = 0; i < obj.length; i++)
					loopBody(i, obj[i]);
			} else {
				for (n in obj)
					loopBody(n, obj[n]);
			}
			return (arr ? "[" : "{") + String(json) + (arr ? "]" : "}");
		}
	};	  

	/**
	 * Detects hour format from the output of locale string (which does not work in Chrome)
	 */
	function detectHourFormat() {
		var ampm = '1';					// by default, if non-found use the home location's format (?) otherwise this should be replaced with detected format
		if (ampm == 'auto') {
			var d    = new Date();
			var lts  = d.toLocaleTimeString();
			var ampm = lts.charAt(lts.length-1).toLowerCase() == 'm' ? 1 : 0;			
		}
		return ampm;
	}
	
	/**
	 * Create a form to submit longer data (like the dst transitions)
	 */
	function createForm()
	{
	  if (clockWidget)
	    return;
	    
		form = document.createElement('form');
		form.setAttribute('method', 'post');
		form.setAttribute('target', 'frame_' + widgetObjName);
		form.style.display = 'none';
		
		dt_input = document.createElement('input');
		dt_input.setAttribute('name', 'dt');
		dt_input.setAttribute('type', 'hidden');
		
		url_input = document.createElement('input');
		url_input.setAttribute('name', 'pu');
		url_input.setAttribute('type', 'hidden');
		
		form.appendChild(dt_input);
		form.appendChild(url_input);
		
		/**
		 * Modifying parent elements in JS barfs badly in IE6/7.
		 * Therefore cannot need to use a close element.
		 * http://support.microsoft.com/kb/927917/
		 */
		//document.getElementsByTagName('body')[0].appendChild(form);		
		document.getElementById(widgetObjName).appendChild(form);
		 
	}
	
	/**
	 * Reload new URL within the frame to reflect the correct time format
	 */
	function setFormat(fmt) {
		
		var fmtName  = (fmt == 1 ? 'AM' : '24');

		// Set the correct time format element as selected		
		var nodes = thisWidget.getElementsByTagName("span");
		for (var i = 0; i < nodes.length; i++)
		{
			var el     = nodes[i];
			var format = el.getAttribute('format');
			
			// Skip elements that don't have format attr
			if ( ! format) continue;
				
			if (fmtName == format)
				el.className = el.className.replace(' wtb-ew-selected', '') + ' wtb-ew-selected';
			else
				el.className = el.className.replace(' wtb-ew-selected', '');
		}
						
		// Update the iframe url
		var url = widgetUrl
					.replace('[TF]', fmt);
					//.replace('[DT]', transitions);

    // Submit form
    if ( ! clockWidget) {

  		// Set iframe URL (without the has value)
		  url_input.value = window.location.href.replace(window.location.hash, '');
		  dt_input.value = transitions;		
		  
      form.action = url;
      form.method = 'post';
      form.submit();
      		  
		} else {
		  
		  var iframe = document.getElementById('frame_' + widgetObjName);
		  iframe.src = url;
		}
	} 

	/**
	 * Detect DST transitions on the client to determine local time
	 * NOTE: There's an exact duplicate of this in TIME.JS
	 */
	function findDstTransitions(startTS, endTS, delta, level) {
		
		var transitions = [];
		var d1 = new Date();
		var d2 = new Date();

		if (level == undefined)
			level = 0;

		d1.setTime(startTS);
		d2.setTime(endTS);

		for (var i = startTS; i < endTS; i += delta) {

			d1.setTime(i);
			var startTZOffset = d1.getTimezoneOffset();
			
			d2.setTime(i + delta);
			var endTZOffset = d2.getTimezoneOffset();

			// console.log(d1.toLocaleString() + ' - ' + d2.toLocaleString() + ' | delta = ' + delta);

			var diff = startTZOffset - endTZOffset;

			if (diff != 0) {

				var newStartTS = i;
				var newEndTS = i + delta;

				// Get local time, expressed in UTC timestamp
				d1.setTime( d2.getTime() - d1.getTimezoneOffset() * 60 * 1000);

				switch (delta) {
					case deltaMonth: newDelta = deltaDay;    break;
					case deltaDay  : newDelta = deltaHour;   break;				
					case deltaHour : newDelta = deltaMinute; break;
					default:
						var dst_add = ((diff < 0 ? 0 : diff) * 60.0);
						var gmt_offset = -(endTZOffset * 60.0) - dst_add;
						return {           
							gmt_offset : gmt_offset,
							dst_add    : dst_add,
							ts_u       : d2.getTime() / 1000,
							ts_w	   : d1.getTime() / 1000
						};
				}

				var transition = findDstTransitions(newStartTS, newEndTS, newDelta, level + 1);
				
				if (transition)
					transitions = transitions.concat(transition);
										
			}

		}
				
		return transitions;
	}

	/**
	 * Setup the right parameters to find DST transitions, and update the result, as needed.
	 */
	function findDstTransitionsWrapper() {

		// Start looking around the day of the event (+/-2 years)
		var ct       = new Date(1714718689000);
		var tsUtc    = Date.UTC(ct.getFullYear(), ct.getMonth(), ct.getDate(), 0, 0, 0);
		var startTs  = tsUtc - deltaYear * 2;
		var endTs    = tsUtc + deltaYear * 2;

		// First, detect DST transitions from client PC. If nothing is found, use the GMT ofset
		var transitions = findDstTransitions(startTs, endTs, deltaMonth);
		if (transitions.length == 0)
			transitions = -ct.getTimezoneOffset() * 60;			
			
		return JSON.stringify(transitions);
	}

	// Message handling only for scheduling widget
	
	/**
	 * Funtion to retrieve messages from other windows (must be executed by parent before child attempts to communicate up)
	 *
	 * Using the lighweight approach described @ http://www.onlineaspect.com/2010/01/15/backwards-compatible-postmessage/
	 * Originally, condired using EasyXDM (https://github.com/oyvindkinsey/easyXDM#readme) but just seems a bit too complex
	 * for my particular needs.
	 *
	 */
	function receiveMessage(callback, source_origin) {
		
		// browser supports window.postMessage
		if (window['postMessage']) {
			
			// bind the callback to the actual event associated with window.postMessage
			if (callback) {
				var attached_callback = function(e) {
					if ((typeof source_origin === 'string' && e.origin !== source_origin)
                    || (Object.prototype.toString.call(source_origin) === "[object Function]" && source_origin(e.origin) === !1)) {
                    	return !1;
					}
					callback(e, 'postmessage');
				};

				// TODO: Set a flag so that these aren not set multiple times in a row          
				if (window['addEventListener']) {
					window[callback ? 'addEventListener' : 'removeEventListener']('message', attached_callback, !1);
				} else {
					window[callback ? 'attachEvent' : 'detachEvent']('onmessage', attached_callback);
				}				
			}
			
		} else {
			
			// a polling loop is started & callback is called whenever the location.hash changes
			interval_id && clearInterval(interval_id);
			interval_id = null;
			if (callback) {
            	interval_id = setInterval(function() {
					var hash = document.location.hash;
            		//console.log('hash = ' + hash + '... last hash = ' + last_hash);
					re = /^#?\d+&/;
					if (hash !== last_hash && re.test(hash)) {
						last_hash = hash;
						callback({data: hash.replace(re, '')}, 'hash');
					}
				}, 100);
			}
		}
	}
	
	/**
	 * Handle message received from XDM source
	 * 
	 * ... for now just show it. But this needs to be hooking up to some handle
	 * that user provides from the outside.
	 *
	 */
	function handleMessage(e, method) {
		
		// Execute handler only if it came from the source frame created by this script
		if (window.frames['frame_' + widgetObjName] == e.source || method == 'hash') {
		
			var callback = 'wtbNonexistendCallback';
			if (window[callback] != undefined) {
				var data_obj = wtb_widget_1714718689.ev('('+e.data+')'); 
				window[callback](data_obj);
			}
		
			// Debug stuff
			//setTimeout((function(data) { return function() { alert('yes ' + data); } }(e.data)), 500);	
			//window.console.log(e.data);
			
			// Clean up the hashtag (if necessary)
			if (method != undefined && method == 'hash') 
				window.location = window.location.href.replace(/#.*$/, '') + '#';
		}	
	}

	
				
	// Write the CSS (if has not been written yet)
	if ( ! window[ widgetObjCss ]) {
		// document.write('<link rel="stylesheet" type="text/css" href="https://www.worldtimebuddy.com/media/css/widget_outside.css?165" />');
		// Embedd CSS straight into the script to avoid an extra download
		document.write('<style>#wtb-ew-v1,.wtb-ew-v1{display:inline-block;font-size:9px;font-family:Verdana;border-radius:3px;}#wtb-ew-v1 *,.wtb-ew-v1 *{font-size:9px;font-family:Verdana;line-height:1.4;text-shadow:none;}.wtb-ew-v1 a.wtb-event-link,#wtb-ew-v1 a.wtb-event-link{float:right;width:10px;height:10px;margin-top:1px;margin-right:1px;background:transparent url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAABGdBTUEAALGPC/xhBQAAAAlwSFlzAAAOwgAADsIBFShKgAAAABp0RVh0U29mdHdhcmUAUGFpbnQuTkVUIHYzLjUuMTAw9HKhAAAARklEQVQoU63QwQoAIAgDUP//p80WSwPXSaHLeCzU3N3EizhHoZpD76AbwmsIu2YiGAUrQkkHnyYuempjPptn4zwUJ2KMrxfqE0TKF+8WMwAAAABJRU5ErkJggg==) no-repeat;}.wtb-ew-v1 .wtb-ew-outside,#wtb-ew-v1 .wtb-ew-outside{display:inline-block;background:#8BA1BB url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAABGdBTUEAALGPC/xhBQAAAAlwSFlzAAAOwgAADsIBFShKgAAAABp0RVh0U29mdHdhcmUAUGFpbnQuTkVUIHYzLjUuMTAw9HKhAAAAOElEQVQoU2Oor683+v//PwM6BomDMAOMgUsRXAEuk8BGw0zBpghuNy5FKI7Dpgin62HWYShAdxMAxC6f8UpkYsAAAAAASUVORK5CYII=) repeat;padding:5px;-webkit-border-radius:3px;-moz-border-radius:3px;border-radius:3px;}.wtb-ew-v1 .wtb-ew-locations,#wtb-ew-v1 .wtb-ew-locations{-webkit-border-radius:3px;-moz-border-radius:3px;border-radius:3px;background:#fff;}.wtb-ew-v1 .wtb-ew-bottom,#wtb-ew-v1 .wtb-ew-bottom{color:#fff;font-size:9px;margin-top:5px;display:block;}.wtb-ew-v1 .wtb-ew-powered,#wtb-ew-v1 .wtb-ew-powered{color:#eee;float:left;}.wtb-ew-v1 .wtb-ew-logo,#wtb-ew-v1 .wtb-ew-logo{float:left;margin-left:4px;font-weight:bold;text-decoration:none;color:#fff;text-transform:uppercase;}.wtb-ew-v1 .wtb-ew-logo span,#wtb-ew-v1 .wtb-ew-logo span{margin-left:-1px;}.wtb-ew-v1 .wtb-tf,#wtb-ew-v1 .wtb-tf{float:right;text-transform:uppercase;padding:0 3px;-webkit-border-radius:3px 0 0 3px;-moz-border-radius:3px 0 0 3px;-webkit-border-radius:3px;-moz-border-radius:3px;border-radius:3px;cursor:pointer;}.wtb-ew-v1 .wtb-tf-24,#wtb-ew-v1 .wtb-tf-24{margin-right:2px;margin-left:1px;}.wtb-ew-v1 .wtb-ew-bottom .wtb-ew-selected,#wtb-ew-v1 .wtb-ew-bottom .wtb-ew-selected{background:#fff;color:#8BA1BB;}</style>');
		document.write('<!--[if lt IE 8]>');
		document.write('<style>#wtb-ew-v1 a.wtb-event-link,.wtb-ew-v1 a.wtb-event-link { background: transparent url(https://www.worldtimebuddy.com/media/img/open-event.png?165) no-repeat }</style>');
		document.write('<![endif]-->');
		window[ widgetObjCss ] = true;
	}

	// Insert this so the freaking comment does not move up into the previous scope!
	widgetObjName;

	// Write CSS to control widget color
		document.write('<style>#wtb-ew-v1 #' + widgetObjName + ',.wtb-ew-v1 #' + widgetObjName + '{ background-color: #000000 } #' + widgetObjName + ' .wtb-ew-bottom .wtb-ew-selected{ color: #000000 }</style>');
	
	// Insert this so the freaking next php line substitubtes okey - apparently they can't follow each other
	widgetObjName;
		
	// Create listener for to receive XDM messages (host must be without the trailing slash). Only for the schedulign widget
		receiveMessage(handleMessage, 'https://www.worldtimebuddy.com');
	

	// Create the outside frame	
	// var $outside = $(
	document.write(  '<span class="wtb-ew-outside" id="' + widgetObjName +'">'
					+'	<iframe frameborder="0" name="frame_' + widgetObjName + '" id="frame_' + widgetObjName + '" scrolling="no" class="wtb-ew-locations" style="width: 359px; height: 98px;" src=""></iframe>'
					+'	<span class="wtb-ew-bottom" style="width: 359px;">'
					+'		<span id="' + widgetObjName + '_wl"><span class="wtb-ew-powered">Powered by</span></span>'
										+ ''					
										+'		<span title="Switch to 24-hour format" class="wtb-tf wtb-tf-24" format="24" onmousedown="' + widgetObjName + '.sf(0)">24</span>'
					+'		<span title="Switch to AM/PM format"   class="wtb-tf" 			format="AM" onmousedown="' + widgetObjName + '.sf(1)">am/pm</span>'
					+'		<span style="clear:both;display:block"></span>'
					+'	</span>'
					+'</span>');
					
	// Once, the html is there, look for it
	var thisWidget  = document.getElementById(widgetObjName);
	var transitions = findDstTransitionsWrapper();

	// Create the form	
	createForm();
	
	// Record widget name into an array
	if (! window['wtb_event_widgets'])
		window['wtb_event_widgets'] = [];
		
	window['wtb_event_widgets'].push( widgetObjName );

	// Find and remove original event link (after existing this function though, prevent the link from flickering on load)
	// NEED TO call this function explicitly from the new code after the link (or it won't work)	
	function initWidget() {
			
		// For old widget, just hide the link
		var t = thisWidget.parentNode.getElementsByTagName('i');

		// Try to look against for 'em' tag cause sometimes blog systems rewrite it
		if (t.length == 0) {
			t = thisWidget.parentNode.getElementsByTagName('em');
		}			

		// Otherwise, just find the straight up link
		if (t.length == 0) {
			t = thisWidget.parentNode.getElementsByTagName('a')[0].style.display = 'none';
		} else {
			var originalEventLink = t[0];	
			var reml = originalEventLink.parentNode.removeChild(originalEventLink);
			var link = reml.firstChild;
			// Making sure there's a correct link, but omitting the protocol (comparing from ://onwards)
			if (link == null || link.tagName.toLowerCase() != 'a' || link.href.toLowerCase().indexOf('://www.worldtimebuddy.com/') < 0) {
				thisWidget.innerHTML = 'widget code error';
				return;				
			}
			link.className = 'wtb-ew-logo';			
			link.target = '_blank';
			link.title="World Clock & Time Converter";
			link.innerHTML = 'world <span>time</span> <span>buddy</span>';
			document.getElementById(thisWidget.id + '_wl').appendChild(link);

		}
					
		// Set format based on detection		
		setFormat( detectHourFormat() );						 
	}
	
	// Call init explicitly if widget V1 
	
	// Create a global presense
	window[ widgetObjName ] = {
		sf: setFormat,
		init: initWidget
	};  
		
}()); 