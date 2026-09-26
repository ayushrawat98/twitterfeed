const replyButton = document.querySelectorAll(".replyButton")
const form = document.querySelector("form")
const textBox = document.querySelector("#content")

document.getElementById('name').addEventListener('input', (e) => {
	localStorage.setItem('username', e.target.value)
})

let username = localStorage.getItem('username')
if (username) document.getElementById('name').value = username


replyButton.forEach(btn => {
	btn.addEventListener('click', () => {
		form.classList.remove('hidden')
		if (textBox.value.trim().length > 0 && !textBox.value.endsWith("\n")) {
			textBox.value += "\n>>" + btn.dataset.postNumber + "\n"
		} else {
			textBox.value += ">>" + btn.dataset.postNumber + "\n"
		}
	})
})

const pasteTextBox = document.getElementById('content');
const imageFileInput = document.getElementById('file');
pasteTextBox.addEventListener('paste', (event) => {
	const items = (event.clipboardData || event.originalEvent.clipboardData).items;
	let imageFile = null;

	for (let i = 0; i < items.length; i++) {
		if (items[i].type.startsWith('image/')) {
			imageFile = items[i].getAsFile();
			break; // Assuming only one image per paste
		}
	}

	if (imageFile) {
		const dataTransfer = new DataTransfer();
		dataTransfer.items.add(imageFile);
		imageFileInput.files = dataTransfer.files;
		// Prevent default paste behavior in the textbox if desired
		event.preventDefault();
	}
});

document.querySelector("form").addEventListener("submit", (e) => {
	e.preventDefault()
	const formData = new FormData(e.target)
	fetch(window.location.pathname, { method: "POST", body: formData }).then((res) => {
		window.location.reload()
	})
	//show message to user
	document.querySelector(".form-message").textContent = "uploading..."
})

const options = {
	threshold: 0.0,
	rootMargin: '200px 0px 200px 0px',
}

const callback = (entries, observer) => {
	entries.forEach((entry) => {
		if (entry.isIntersecting) {
			if (!entry.target.src) {
				entry.target.src = entry.target.dataset.src
			}
			observer.unobserve(entry.target);
		}
	})
}

const observer = new IntersectionObserver(callback, options)
document.querySelectorAll(".post__thumbnail").forEach(thumbnail => observer.observe(thumbnail))
