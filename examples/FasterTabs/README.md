
# Faster

This app demonstrates a library that is built to improve the perceived performance of apps by lazy-loading certain tasks.

So far there are three focus areas on how this app schedules tasks:

1. Tab views are normally rendered immediately. This app will lazy-load tabs the first time each tab is viewed.
2. ScrollableViews are also normally rendered immediately. This will lazy-load screens as late as possible while still allowing for smooth scrolling.
3. Expensive tasks block all event processing until they are complete. Even breaking the tasks up into pieces and using the _.deferred() hack doesn't help because an event will only go in line behind the queue of deferred tasks. The Faster library allows you to break a task into pieces and queues them in a way that does not block event handling.

## Faster Tabs

This is a template project that provides a faster startup than the default Two-Tabbed Alloy Application provided by Titanium.

The problem with the Titanium Tabbed App template is that all the tabs are immediately rendered when the app starts up. Most of the time the user will not need to use all tabs right away so this does a lot of unnecessary work. This implementation only renders tabs when they are first opened.

### Converting an existing tabbed app to a Faster Tabs app

To convert your app, there are three basic steps. First, add the `faster` library, then isolate the screen view for each tab, then create a launch view for each tab.

#### Step 1: Add the library

1. Drop the `faster.js` file into your Alloy `lib` folder
2. Wherever you use `TabGroup` and `Tab` you'll need to instruct Alloy to use the `faster` implementation. Add `module="com.capnajax.faster"` to each `<TabGroup/>` and `<Tab/>` tag.

Example:

<pre>
	&lt;Alloy&gt;
		&lt;TabGroup <span style="color:red">module="com.capnajax.faster"</span>&gt;
			&lt;Tab <span style="color:red">module="com.capnajax.faster"</span> title="Tab 1"&gt;
				&lt;Window title="Tab 1"&gt;
					&lt;Label>I am Window 1&lt;/Label&gt;
				&lt;/Window&gt;
			&lt;/Tab&gt;
			&lt;Tab <span style="color:red">module="com.capnajax.faster"</span> title="Tab 2"&gt;
				&lt;Window title="Tab 2"&gt;
					&lt;Label&gt;I am Window 2&lt;/Label&gt;
				&lt;/Window&gt;
			&lt;/Tab&gt;
		&lt;/TabGroup&gt;
	&lt;/Alloy&gt;
</pre>

At this point your application will still work exactly the same as it did before adding the `faster` library. All tabs load immediately on startup.

It is important to note that the contents of the `<Tab/>` element still render immediately on startup. Now we need to set up the screen view for deferred rendering.

#### Step 2: Isolate the tab view

The content of the `<Tab/>` elements is now called the launch view. This view is immediately rendered when the app starts up. In order to gain performance benefits from the `faster` library, the content of the tab needs to be isolated into its own controller.

The controller is first created the first time the tab is opened and remains in memory for the life of the app. The controller is not passed any parameters when it is created. To reference the controller, use the `require` attribute.

<pre>
	&lt;Tab module="com.capnajax.faster" title="Tab 2" <span style="color:red">require="complexView1"</span>&gt;
		&lt;Window title="Tab 2"&gt;
			&lt;Label&gt;I am Window 2&lt;/Label&gt;
		&lt;/Window&gt;
	&lt;/Tab&gt;
</pre>

Now the original tab must reference the controller. 

#### Step 3: Create the launch view

The launch view is a bit that is rendered immediately on app startup. This is important for a couple reasons. First, the `Tab` must respond immediately when selected. Any lag in response will make the app feel sluggish. Second, the `Tab` API requires a top-level window at the time it's created and this window cannot be changed.

Your tab will already have a launch view but it needs to be modified in order to work properly.

1. It is critical that the top-level window in this view have the default `layout="composite"`. This is the default for `Window` anyway, but if the layout is set to `"horizontal"` or `"vertical"` it will break. The tab view will overlay the launch view; this requires the `"composite"` layout to work.
2. The launch view should be as simple as possible to ensure quick startup. The best launch view is simply an image that resembles the background of the tab. Remember that the launch view will show through the tab view so if there are any mata angustas (spinners) or other animations, they need to be cleared when the tab is ready.

## Faster ScrollableViews

Normally a `ScrollableView` created in Alloy will render all its pages immediately. If the pages of the `ScrollableView` are complex, this will cause a noticeable delay when starting the app or first viewing the screen that contains the ScrollableView.

This `ScrollableView` will wait to render its pages until necessary. When the app starts up, the first page is rendered, and the `ScrollableView` is ready. Subsequent pages are scheduled to render in such a way to limit the impact or visibility of the rendering process.

### Converting an existing ScrollableView into a Faster ScrollableView

To convert your `ScrollableView`, there are three basic steps. First isolate the view for each page, then add the `faster` library, then break the initial render of each screen into small pieces.

####Step 1: Isolate the view for each page

The contents of each page of the `ScrollableView` should be in its own file, each being required-in. The `<ScrollableView/>` element should only contain `<Require/>` elements when you are done.

Example:

<pre>
	&lt;ScrollableView&gt;
		&lt;Require type="view" src="page1"/&gt;
		&lt;Require type="view" src="page2"/&gt;
		&lt;Require type="view" src="page34" pagenum="3"/&gt;
		&lt;Require type="view" src="page34" pagenum="4"/&gt;
	&lt;/ScrollableView&gt;
</pre>

Of course, at this point your app will still work exactly the same as before. In fact, your app may already have been structured that way. This is a good time to regression test your app to ensure nothing has changed.

#### Step 2: Add the library

1. Drop the `faster.js` file into your Alloy `lib` folder
2. Wherever you use `ScrollableView`, you'll need to instruct Alloy to use the `faster` implementation. Add `module="com.capnajax.faster"` to the `<ScrollableView/>` tag.
3. Convert the `<Require/>` tags from Step 1 to `<ScrollablePage/>` tags. Global-replace `Require` with `ScrollablePage module="com.capnajax.faster"` and `src=` with `require=`. Faster will still pass all options that were originally passed to the required-in controller.

<pre>
	&lt;ScrollableView&gt;
		&lt;ScrollablePage module="com.capnajax.faster" require="page1"/&gt;
		&lt;ScrollablePage module="com.capnajax.faster" require="page2"/&gt;
		&lt;ScrollablePage module="com.capnajax.faster" require="page34" pagenum="3"/&gt;
		&lt;ScrollablePage module="com.capnajax.faster" require="page34" pagenum="4"/&gt;
	&lt;/ScrollableView&gt;
</pre>

Unlike the `src` attribute of the `<Require/>` tag, the `require` attribute of the `<ScrollablePage/>` tag can be specified in the `.tss`.

#### Step 3: Break up the work load

This is an optional task, only necessary if an individual screen takes a long time to render.

Screens generally render immediately after the screen before it has come into focus. If your users are likely to scroll to the right several times in rapid succession or interact with a page within the time it takes the page after to render, they will notice delays.

Therefore, to ensure that all user interaction remains responsive and scrolls remain smooth, it is necessary to split the task into manageable units and schedule them intelligently. Refer to the next section, "Faster Task Queue" for instructions on handling this.

## Faster Task Queue

Underscore's `_.defer(fn)` or the `setTimeout(fn, 0)` are common ways to allow more rendering to occur before certain heavy elements are added to the screen. However there is one issue to this:

JavaScript has a single task queue, all items are added to the back of the queue, and they are not handled until the item queued before it is complete. Therefore, if a number of tasks are queued using `_.defer(fn)` and then something fires a `scroll` event, that event will not be recognized until all items that were queued using `defer` are complete.

Faster creates a shadow queue so that a "Faster" task will not be added to the JavaScript task queue until the previous Faster task has completed. This allows events such as `scroll` to be processed in between Faster tasks.

<pre>
	var faster = require('com.capnajax.faster');
	faster.queueTask(function() {
		... // small piece of complicated task 1
	});
	faster.queueTask(function() {
		... // small piece of complicated task 2
	});
	faster.queueTask(function(param1, param2) {
		... // small piece of complicated task 3 with two parameters
	}, param1, param1);
	faster.queueTask(function(param1, param2) {
		... // small piece of complicated task 4 with two parameters
	}, param1, param2);
</pre>

Or, in a short form:

<pre>
	var q = require('com.capnajax.faster').taskQueue;
	q(function() {
		... // small piece of complicated task 1
	});
	q(function() {
		... // small piece of complicated task 2
	});
	q(function(param1, param2) {
		... // small piece of complicated task 3 with two parameters
	}, param1, param2);
	q(function(param1, param2) {
		... // small piece of complicated task 4 with two parameters
	}, param1, param2);
</pre>

Remember that non-faster tasks will be executed before faster tasks, so be sure you don't alter the sequence of tasks!


