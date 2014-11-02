
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

		// on iOS and Android I am rendering mostly off the screen and sliding it in when the rendering is complete
		// on mobile web, I am waiting until the view is focused before even adding the required view.

		var required	= Alloy.createController(options.require),
			rootRect	= rootWindow.rect,
			container	= Ti.UI.createView({
								opacity: 0,
								width: rootRect.width,
								height: rootRect.height,
								left: OS_MOBILEWEB ? 0 : (rootRect.width ? rootRect.width-1 : 0),
								top: OS_MOBILEWEB ? 0 : (rootRect.height ? rootRect.height-1 : 0)
						  });

		var isAfterRequiredPostLayout = false;
		if(rootRect.height === 0) {
			// sometimes the focus event can occur before the tab view layout is complete, so the container view has
			// a zero size.
			Ti.API.debug("faster::createTab focusHandler setting up fixContainer");
			var fixContainer = function() {
				rootWindow.removeEventListener('postlayout', fixContainer);
				rootRect = rootWindow.rect;
				Ti.API.debug("faster::createTab focusHandler fixContainer called, rootRect = " + JSON.stringify(rootRect));
				container.applyProperties({
					width: rootRect.width,
					height: rootRect.height,
					left: (OS_MOBILEWEB || isAfterRequiredPostLayout) ? 0 : rootRect.width-1,
					top: (OS_MOBILEWEB || isAfterRequiredPostLayout) ? 0 : rootRect.height-1
				});
				OS_MOBILEWEB && _.defer(function() {container.add(required.getView());});
			};
			rootWindow.addEventListener('postlayout', fixContainer);
		}


		Ti.API.debug("faster::createTab focusHandler - rootRect = " + JSON.stringify(rootRect));

		var requiredPostLayout = function() {
			Ti.API.debug("faster::createTab requiredPostLayout called");
			required.getView().removeEventListener('postlayout', requiredPostLayout);
			container.applyProperties({top: 0, left: 0, opacity: 1});
			isAfterRequiredPostLayout = true;
			options.launchWindow && _.defer(function() {launchView.fireEvent('launched', {});});
		};
		required.getView().addEventListener('postlayout', requiredPostLayout);							

		OS_MOBILEWEB || container.add(required.getView());
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
