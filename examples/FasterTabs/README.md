
# Faster Tabs

This is a template project that provides a faster startup than the default Two-Tabbed Alloy Application provided by Titanium.

The problem with the Titanium template is that all the tabs are immediately rendered when the app starts up. Most of the time the user will not need to use all tabs right away so this does a lot of unnecessary work. This implementation only renders tabs when they are first opened.

# Converting your existing app

To convert your app, there are three basic steps. First add the `faster` library, then isolate the screen view for each tab, then create a launch view for each tab.

## Step 1: Add the library

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

## Step 2: Isolate the tab view

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

## Step 3: Create the launch view

The launch view is a bit that is rendered immediately on app startup. This is important for a couple reasons. First, the `Tab` must respond immediately when selected. Any lag in response will make the app feel sluggish. Second, the `Tab` API requires a top-level window at the time it's created and this window cannot be changed.

Your tab will already have a launch view but it needs to be modified in order to work properly.

1. It is critical that the top-level window in this view have the default `layout="composite"`. This is the default for `Window` anyway, but if the layout is set to `"horizontal"` or `"vertical"` it will break. The tab view will overlay the launch view; this requires the `"composite"` layout to work.
2. The launch view should be as simple as possible to ensure quick startup. The best launch view is simply an image the resembles the background of the tab. Remember that the launch view will show through the tab view so if there are any mata angustas (spinners) or other animations, they need to be cleared when the tab is ready.












