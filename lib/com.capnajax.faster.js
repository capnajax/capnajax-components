
function createTabGroup(options) {
	return Ti.UI.createTabGroup(options);
}

function createTab(options) {
	
	var rootWindow 		= options.window || Ti.UI.createWindow({}),
		tab 			= Ti.UI.createTab(
								_.extend(
										_.omit(options, "require", "launchImage", "launchWindow"), 
										{window: rootWindow}
								));
	
	// set up the view that appears when the tab is selected. This is not done until the tab is actually selected
	var focusHandler = function() {
		tab.removeEventListener('focus', focusHandler);
		viewInFocus(rootWindow, options);
	};	
	
	// focus events indicate when a tab is selected
	options.require && tab.addEventListener('focus', focusHandler);

	return tab;
}

function createScrollableView(options) {
	
	var scrollableView = Ti.UI.createScrollableView(options);
	
	// this page tracking is meant to speed up the scroll event handling. This is a very simple cache that empties
	// 500ms after creation every time it's created. It stores true/false for each view to indicate if the rendered
	// state of the page is set. Otherwise it would have to cross the bridge to get that information. Because scroll
	// events happen in rapid succession, crossing the bridge every time it's fired is unacceptable.
	var renderedAr = null,
		renderedArTimeout = null;
	
	// when a view on this scrollable becomes visible, send an event to that view to indicate it needs to render
	// itself.
	var renderPage = function(pageNum) {

		if(!scrollableView.views[pageNum]) {
			// this can happen when "bouncing back" after scrolling too far to the left or right. We can ignore this
			return;
		}

		// first check that renderedAr exists and set a timeout for last access
		if(null != renderedArTimeout) {
			clearTimeout(renderedArTimeout);				
		}
		if(null == renderedAr) {
			renderedAr = [];
		}
		renderedArTimeout = setTimeout(function(){renderedAr = null;}, 200);

		if(!renderedAr[pageNum]) { // false means the rendered state hasn't been checked
			if(!scrollableView.views[pageNum].renderStarted) {
				_.defer(function () {scrollableView.views[pageNum].fireEvent("com.capnajax.faster.inview", {});});
				scrollableView.views[pageNum].renderStarted = true;
			}
			renderedAr[pageNum] = true; // true means the rendered state has been checked, if necessary, started
		}

	};
	scrollableView.addEventListener('scroll', function(e) {
		Ti.API.debug("scroll");
		if(null == renderedAr) {
			_.map(scrollableView.views, function() {return false;});
			setTimeout(function() {renderedAr == null;}, 500);
		}

		renderPage(Math.ceil(e.currentPageAsFloat));
		renderPage(Math.floor(e.currentPageAsFloat));
	});
	// render one page ahead when done scrolling
	scrollableView.addEventListener('scrollend', function(e) {
		Ti.API.debug("scrollend " + e.currentPage);
		if(scrollableView.views.length > e.currentPage+1) {
			Ti.API.debug("scrollend rendering " + e.currentPage+1);
			renderScrollablePage(scrollableView.views[e.currentPage+1]);
		}
	});
	// render the first view in the scrollable
	if(scrollableView.views && (scrollableView.views.length > 0)) {
		renderScrollablePage(scrollableView.views[0]);
		if(options.views.length > 1) {
			// there is no scrollend on the first screen so let's just start rendering the second page after a 
			// short delay. If the user scrolls before that delay is up, they should only notice that the page is
			// rendering behind their scroll instead of ahead of it
			setTimeout(function() {
				renderScrollablePage(scrollableView.views[1]);
			}, 500);
		}
	}
	
	return scrollableView;
}

function createScrollablePage(options) {
	var page = Ti.UI.createView(_.omit(options, "require", "launchImage", "launchView"));

	page.renderStarted = false;	

	// set up the view that appears when the tab is selected. This is not done until the tab is actually selected
	var inviewHandler = function() {
		page.renderStarted = true;	
		viewInFocus(page, options);
	};
	options.require && page.addEventListener("com.capnajax.faster.inview", inviewHandler);
	options.require && page.addEventListener("render", function() {
		queueTask(function() {
			if(!page.renderStarted) {
				inviewHandler();
			}
		});
	});
	options.require && page.addEventListener("focus", inviewHandler);
	
	return page;
}

function renderScrollablePage(page) {
	page.fireEvent("render");
}

// this sets up the view once, and it remains in memory for the life of the app.
// TODO future feature: set up a memory management feature to allow this view to be unloaded as needed and rebuilt
//		when selected again.
var viewInFocus = function(rootWindow, options) {

	// on iOS and Android I am rendering mostly off the screen and sliding it in when the rendering is complete
	// on mobile web, I am waiting until the view is focused before even adding the required view.

	var required	= Alloy.createController(options.require, options),
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
		var fixContainer = function() {
			rootWindow.removeEventListener('postlayout', fixContainer);
			rootRect = rootWindow.rect;
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

	var requiredPostLayout = function() {
		required.getView().removeEventListener('postlayout', requiredPostLayout);
		container.applyProperties({top: 0, left: 0, opacity: 1});
		isAfterRequiredPostLayout = true;
	};
	required.getView().addEventListener('postlayout', requiredPostLayout);							

	OS_MOBILEWEB || container.add(required.getView());
	rootWindow.add(container);
};

var taskQueue = [],
	taskOngoing = false; // this means there is a task currently running or _.defer()ed.

var queueTask = function(fn) {
	var task = {fn:fn, args:_.rest(arguments, 1)};
	taskQueue.push(task);
	taskOngoing || nextTask();
};
var runTask = function() {
	var task = taskQueue.shift();
	task.fn.apply(this, task.args);
	if(taskQueue.length > 0) {
		_.defer(nextTask);
	} else {
		taskOngoing = false;
	}
};
var nextTask = function() {
	Ti.API.debug("nextTask");
	taskOngoing = true;
	_.defer(runTask);
};

module.exports = {
	createTabGroup		: createTabGroup,
	createTab			: createTab,
	createScrollableView: createScrollableView,
	createScrollablePage: createScrollablePage,
	renderScrollablePage: renderScrollablePage,
	queueTask			: queueTask
};
