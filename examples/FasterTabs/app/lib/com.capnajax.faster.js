
function createTabGroup(options) {
	return Ti.UI.createTabGroup(options);
}

function createTab(options) {
	
	Ti.API.debug("faster::createTab called, title == " + options.title);
	
	var launchView		= null, 
		rootWindow 		= options.window || Ti.UI.createWindow({}),
		tab 			= Ti.UI.createTab(
								_.extend(
										_.omit(options, "require", "launchImage", "launchWindow"), 
										{window: rootWindow}
								));

	Ti.API.debug("faster::createTab setting up launchView");
	
	options.require && Ti.API.debug("faster::createTab setting up selected event");
	
	// set up the view that appears when the tab is selected. This is not done until the tab is actually selected
	
	// this sets up the view once, and it remains in memory for the life of the app.
	// TODO future feature: set up a memory management feature to allow this view to be unloaded as needed and rebuilt
	//		when selected again.
	var focusHandler = function() {

		Ti.API.debug("faster::createTab focusHandler called");
	
		tab.removeEventListener('focus', focusHandler);

		var required	= Alloy.createController(options.require),
			rootRect	= rootWindow.rect;
			
		var	container	= Ti.UI.createView({
								opacity: 0,
								width: rootRect.width,
								height: rootRect.height,
								left: rootRect.width ? rootRect.width-1 : 0,
								top: rootRect.height ? rootRect.height-1 : 0
						  });

		var isAfterRequiredPostLayout = false;
		if(rootRect.height === 0) {
			// sometimes the focus event can occur before the tab view layout is complete, so the container view has
			// a zero size.
			Ti.API.debug("faster::createTab focusHandler setting up fixContainer");
			var fixContainer = function() {
				Ti.API.debug("faster::createTab focusHandler fixContainer called");
				rootWindow.removeEventListener('postlayout', fixContainer);
				rootRect = rootWindow.rect;
				container.applyProperties({
					width: rootRect.width,
					height: rootRect.height,
					left: isAfterRequiredPostLayout ? 0 : rootRect.width-1,
					top: isAfterRequiredPostLayout ? 0 : rootRect.height-1
				});
			};
			rootWindow.addEventListener('postlayout', fixContainer);
		}


		Ti.API.debug("faster::createTab focusHandler - rootRect = " + JSON.stringify(rootRect));

		var requiredPostLayout = function() {
			required.getView().removeEventListener('postlayout', requiredPostLayout);
			container.applyProperties({top: 0, left: 0, opacity: 1});
			isAfterRequiredPostLayout = true;
			options.launchWindow && _.defer(function() {launchView.fireEvent('launched', {});});
		};				  
		required.getView().addEventListener('postlayout', requiredPostLayout);							

		container.add(required.getView());
		rootWindow.add(container);
	};
	
	
	// unfortunately, focus is the best event to use to determine when a tab is selected
	options.require && tab.addEventListener('focus', focusHandler);

	return tab;
}

module.exports = {
	createTabGroup: createTabGroup,
	createTab: 		createTab
};
