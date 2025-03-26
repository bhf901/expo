let turnstileToken;

function toPage(pageNum) {
    if (pageNum === undefined) {
        for (let i = 0; i <= 9; i++) {
            document.getElementById(`page-${i}`).style.display = 'none';
        }
        document.getElementById('welcome-content').style.display = 'block';
    } else {
        document.getElementById('welcome-content').style.display = 'none';
        for (let i = 0; i <= 9; i++) {
            if (i === pageNum) {
                document.getElementById(`page-${i}`).style.display = 'block';
            } else {
                document.getElementById(`page-${i}`).style.display = 'none';
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    toPage(undefined);
    const buttons = document.querySelectorAll('button');
    for (let i = 0; i < buttons.length - 1; i++) {
        buttons[i].addEventListener('click', () => {
            if (i === 1) {
                if (!document.getElementById('subject-ethnicity').value || !document.getElementById('subject-gender').value || !document.getElementById('subject-religion').value) {
                    modError.addMessage('All fields are required.');
                    setTimeout(() => {
                        modError.clearMessage();
                    }, 2000);
                } else {
                    toPage(i);
                }
            } else if (i === 0) {
                toPage(i);
            } else {
                if (!document.getElementById(`guess-${i - 1}`).value) {
                    modError.addMessage('All fields are required.');
                    setTimeout(() => {
                        modError.clearMessage();
                    }, 2000);
                } else {
                    toPage(i);
                }
            }
        });
    }
    const submittedStatus = JSON.parse(localStorage.getItem('submitted')) || '';
    if (submittedStatus === 'true') {
        window.location.href = 'success.html';
    }
});

function submitForm() {
    document.getElementById('form-ethnicity').value = document.getElementById('subject-ethnicity').value;
    document.getElementById('form-gender').value = document.getElementById('subject-gender').value;
    document.getElementById('form-religion').value = document.getElementById('subject-religion').value;
    for (let i = 0; i < 8; i++) {
        document.getElementById(`form-guess-${i + 1}`).value = document.getElementById(`guess-${i + 1}`).value;
    }
}

function modError() {
    return undefined;
}

modError.clearMessage = () => {
    document.getElementById('error-msg').textContent = '';
}

modError.addMessage = (msg) => {
    document.getElementById('error-msg').textContent = msg;
}

async function sendToSpreadsheet() {
    if (await verifyTurnstile()) {
        const formData = new FormData(document.getElementById('hidden-form'));
        const email = document.getElementById('user-email').value;
        const parsedEmail = `${email}@ecfs.org`;
        document.getElementById('load-msg').textContent = 'Please wait while we attempt to submit your response. Do not navigate away from this page.';
        try {
            if (email && !email.includes('@')) {
                const response = await fetch('https://expo.benfink.nyc:8443/submit-form', {
                    method: 'POST',
                    headers: { 'User-Email': parsedEmail },
                    body: formData
                });

                if (response.ok) {
                    document.getElementById('load-msg').textContent = '';
                    localStorage.setItem('submitted', JSON.stringify('true'));
                    window.location.href = 'success.html';
                } else if (response.status === 409 || response.status === 400) {
                    document.getElementById('load-msg').textContent = '';
                    modError.addMessage('The email you provided cannot be used.')
                    setTimeout(() => {
                        modError.clearMessage()
                    }, 2000);
                } else if (response.status === 500) {
                    document.getElementById('load-msg').textContent = '';
                    window.location.href = 'error.html';
                }
            }
        } catch (err) {
            document.getElementById('load-msg').textContent = '';
            console.error(err, err.message);
        }
    } else {
        modError.addMessage('Invalid token.');
        setTimeout(() => {
            modError.clearMessage();
        }, 2000);
    }
}

function sendFromButton() {
    document.getElementById('load-msg').textContent = 'Please wait. Do not navigate away from this page.';
    sendToSpreadsheet().then(() => {document.getElementById('load-msg').textContent = '';});
}

async function verifyTurnstile() {
    if (!turnstileToken) {
        modError.addMessage('Please complete the Cloudflare verification to continue.');
        return false;
    }

    try {
        const response = await fetch('https://expo.benfink.nyc:8443/turnstile-verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 'cf-turnstile-response': turnstileToken })
        });

        const data = await response.json();
        return data.success;
    } catch (err) {
        console.error('Turnstile error.', err);
        return false;
    }
}

function loadToken(token) {
    turnstileToken = token;
}
