const messageInput = document.getElementById("message-input");
const messageContainer = document.getElementById("message-container")
const form = document.getElementById("form");

form.addEventListener("submit", e => {
    e.preventDefault()
    let message = messageInput.value;

    if(message == "") return;
    displayMessage(message);
    messageInput.value = "";
})

function displayMessage(message) {
    const element = document.createElement('div');
    element.innerText = message;
    messageContainer.append(element);
}