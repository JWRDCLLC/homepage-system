class HomepageSystem {
	constructor() {
		this.currentPageId = null;
		this.pages = {};
		this.defaultPageId = "home"; // You can change this variable to set the default page
console.log('homepageConfig:', window.homepageConfig);
		this.init();
	}

	async init() {
		try {
			await this.loadAllPages();
			this.generateMenu();
			await this.loadPage(this.defaultPageId);
		} catch (error) {
			this.showError("Failed to initialize the homepage system");
			console.error("Initialization error:", error);
		}
	}

	async loadAllPages() {
		// Use PHP-generated configuration if available, otherwise fallback to static list
		let directory, availableFiles;

		if (window.homepageConfig) {
			// PHP generated the configuration for us
			directory = window.homepageConfig.directory;
			availableFiles = window.homepageConfig.availableFiles;
			console.log(`Using PHP-detected directory: ${directory}`);
			console.log(`Available files from PHP:`, availableFiles);
		} else {
			// Fallback for when PHP is not available (local dev with HTML)
			console.log("No PHP configuration found, using fallback");
			directory = "example";
			availableFiles = ["home.json", "example-list.json", "example-terms.json"];
		}

		// Load each available file from the determined directory
		for (const filename of availableFiles) {
			try {
				const response = await fetch(`./${directory}/${filename}`);
				if (response.ok) {
					const pageData = await response.json();
					this.pages[pageData.id] = pageData;
					console.log(`✓ Loaded ${filename} from /${directory}/`);
				} else {
					console.warn(
						`✗ Failed to load ${filename} from /${directory}/: ${response.status}`
					);
				}
			} catch (error) {
				console.warn(`✗ Error loading ${filename}:`, error);
			}
		}

		// Check if any pages were loaded
		if (Object.keys(this.pages).length === 0) {
			console.error("No pages were loaded");
			throw new Error(`No valid JSON files found in /${directory}/ directory`);
		} else {
			console.log(
				`✓ Successfully loaded ${
					Object.keys(this.pages).length
				} pages from /${directory}/`
			);
		}
	}

	generateMenu() {
		const menuContainer = document.getElementById("navigation-menu");
		menuContainer.innerHTML = "";

		Object.values(this.pages).forEach((page) => {
			const li = document.createElement("li");
			const link = document.createElement("a");
			link.href = "#";
			link.textContent = page.name;
			link.dataset.pageId = page.id;

			link.addEventListener("click", (e) => {
				e.preventDefault();
				this.loadPage(page.id);
			});

			li.appendChild(link);
			menuContainer.appendChild(li);
		});
	}

	async loadPage(pageId) {
		if (!this.pages[pageId]) {
			this.showError(`Page "${pageId}" not found`);
			return;
		}

		const page = this.pages[pageId];
		this.currentPageId = pageId;

		// Update hero section
		document.getElementById("page-title").textContent = page.title;
		document.getElementById("page-subtitle").textContent = page.subtitle || "";

		// Update active menu item
		document.querySelectorAll("#navigation-menu a").forEach((link) => {
			link.classList.toggle("active", link.dataset.pageId === pageId);
		});

		// Render page content based on type
		const mainContent = document.getElementById("main-content");
		mainContent.innerHTML = '<div class="loading">Loading content...</div>';

		// Add page-type class to main content
		mainContent.className = `page-${page.type}`;

		try {
			if (page.type === "list") {
				this.renderListPage(page);
			} else if (page.type === "terms") {
				this.renderTermsPage(page);
			} else {
				this.showError(`Unknown page type: ${page.type}`);
			}
		} catch (error) {
			this.showError("Failed to render page content");
			console.error("Render error:", error);
		}
	}

	renderListPage(page) {
		const mainContent = document.getElementById("main-content");
		let html = "";

		page.data.forEach((section) => {
			if (section.type === "list") {
				html += this.renderList(section);
			} else if (section.type === "nested-list") {
				html += this.renderNestedList(section);
			}
		});

		mainContent.innerHTML = html;
	}

	renderList(section) {
		let html = `<div class="list-section">
            <h3>${section.title}</h3>
            <div class="list-content">`;

		section.content.forEach((item) => {
			html += `<a href="${item.url}" target="_blank">${item.text}</a>`;
		});

		html += "</div></div>";
		return html;
	}

	renderNestedList(section) {
		let html = `<div class="list-section nested-list-section">
            <h3>${section.title}</h3>`;

		section.subtitles.forEach((subtitle) => {
			html += `<h4>${subtitle.title}</h4>
                <div class="list-content">`;

			subtitle.content.forEach((item) => {
				html += `<a href="${item.url}" target="_blank">${item.text}</a>`;
			});

			html += "</div>";
		});

		html += "</div>";
		return html;
	}

	renderTermsPage(page) {
		const mainContent = document.getElementById("main-content");

		// Sort terms alphabetically
		const sortedTerms = [...page.data].sort((a, b) =>
			a.term.toLowerCase().localeCompare(b.term.toLowerCase())
		);

		// Generate table of contents
		let html = `<div class="table-of-contents">
            <h2>Table of Contents</h2>
            <ul class="toc-list">`;

		sortedTerms.forEach((term) => {
			const id = this.generateTermId(term.term);
			html += `<li><a href="#${id}">${term.term}</a></li>`;
		});

		html += "</ul></div>";

		// Generate term blocks
		sortedTerms.forEach((term) => {
			html += this.renderTerm(term, page);
		});

		mainContent.innerHTML = html;

		// Trigger Prism.js syntax highlighting
		if (typeof Prism !== "undefined") {
			Prism.highlightAll();
		}
	}

	renderTerm(term, page) {
		const id = this.generateTermId(term.term);
		let html = `<div class="term-block" id="${id}">
            <div class="term-header">
                <h3 class="term-title">${term.term}</h3>
            </div>
            <div class="term-content">
                <div class="term-definition">${term.definition}</div>`;

		// Render flags if they exist
		if (term.flags && term.flags.length > 0) {
			html += '<div class="term-flags">';
			term.flags.forEach((flag) => {
				const [flagName, flagDescription] = flag.split(": ");
				html += `<span class="flag"><strong>${flagName}</strong>: ${flagDescription}</span>`;
			});
			html += "</div>";
		}

		// Render examples
		if (term.examples && term.examples.length > 0) {
			html += '<div class="term-examples">';
			term.examples.forEach((example, index) => {
				const exampleId = `${id}-example-${index}`;
				html += `<div class="example">
                    <div class="example-header">
                        <span class="example-text">${example.text}</span>
                        <button class="copy-btn" onclick="homepageSystem.copyToClipboard('${exampleId}', this)">
                            Copy Code
                        </button>
                    </div>
                    <pre><code class="language-${
											page.language || "javascript"
										}" id="${exampleId}">${this.escapeHtml(
					example.code
				)}</code></pre>
                </div>`;
			});
			html += "</div>";
		}

		html += "</div></div>";
		return html;
	}

	generateTermId(term) {
		return term
			.toLowerCase()
			.replace(/[^a-z0-9]/g, "-")
			.replace(/-+/g, "-");
	}

	escapeHtml(text) {
		const div = document.createElement("div");
		div.textContent = text;
		return div.innerHTML;
	}

	async copyToClipboard(elementId, button) {
		try {
			const element = document.getElementById(elementId);
			const text = element.textContent;

			await navigator.clipboard.writeText(text);

			// Visual feedback
			const originalText = button.textContent;
			button.textContent = "Copied!";
			button.classList.add("copied");

			setTimeout(() => {
				button.textContent = originalText;
				button.classList.remove("copied");
			}, 2000);
		} catch (error) {
			console.error("Failed to copy to clipboard:", error);

			// Fallback for older browsers
			const element = document.getElementById(elementId);
			const range = document.createRange();
			range.selectNode(element);
			window.getSelection().removeAllRanges();
			window.getSelection().addRange(range);

			try {
				document.execCommand("copy");
				button.textContent = "Copied!";
				button.classList.add("copied");

				setTimeout(() => {
					button.textContent = "Copy Code";
					button.classList.remove("copied");
				}, 2000);
			} catch (fallbackError) {
				console.error("Fallback copy failed:", fallbackError);
			}

			window.getSelection().removeAllRanges();
		}
	}

	showError(message) {
		const mainContent = document.getElementById("main-content");
		mainContent.innerHTML = `<div class="error">${message}</div>`;
	}
}

// Initialize the system when the DOM is ready
document.addEventListener("DOMContentLoaded", () => {
	window.homepageSystem = new HomepageSystem();
});
