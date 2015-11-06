
<body>
	<h1>Phantom Alternatives</h1>
	<ul>
		<li><a href="http://www.asad.pw/HeadlessBrowsers/">List of (almost) all Headless Browsers</a></li>
		<p>Re CasperJS: based on phantom with useful built-in high-level methods to do things like download resources, fill & submit forms, click/follow links, log events, <strong>API for dealing with async stuff to prevent callback hell</strong>, </p>
		<p>
		<li>Out of the lightweight JS headless browsers, one with the most contributors/popularity seemed to be <a href="http://zombie.js.org/">Zombie.js</a></li>
		<li>https://www.quora.com/What-is-the-main-difference-between-phantom-js-and-zombie-headless-website-testing-framework</li>
		<li>http://www.slant.co/topics/888/compare/~phantomjs_vs_zombie-js_vs_xvfb</li></p>
	</ul>
	<h2>Demo</h2>
	<ul>
		<li>Buffer.js robot script is modified to use zombie for logging in (previously used phantom - see commented out code)</li>
		<li>Put Buffer.js in hdrobots/robots (overwrite existing script)</li>
		<li>In Hdrobots, npm install --save zombie@2.5.1</li>
		<li>Run test_robot and if all goes well, the robot should run like any other robot</li>
	</ul>

</body>
</html>
