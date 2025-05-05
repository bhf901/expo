let turnstileToken;

function toPage(pageNum) {
    if (pageNum === undefined) {
        for (let i = 0; i <= 11; i++) {
            document.getElementById(`page-${i}`).style.display = 'none';
        }
        document.getElementById('welcome-content').style.display = 'block';
    } else {
        document.getElementById('welcome-content').style.display = 'none';
        for (let i = 0; i <= 11; i++) {
            if (i === pageNum) {
                document.getElementById(`page-${i}`).style.display = 'block';
            } else {
                document.getElementById(`page-${i}`).style.display = 'none';
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('content').style.display = 'block';
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
    for (let i = 1; i <= 10; i++) {
        document.getElementById(`input-${i}`).style.display = 'none';
    }

    document.querySelectorAll('.audio-button').forEach((button, index) => {
        button.addEventListener('click', () => {
            disablePlay(button, true);
            document.getElementById(`audio-${index + 1}`).play();
            const ms = document.getElementById(`audio-${index + 1}`).duration * 1000;
            setTimeout(() => {
                document.getElementById(`input-${index + 1}`).style.display = 'block';
                disablePlay(button, false);
            }, ms)
        });
    });

    const submittedStatus = JSON.parse(localStorage.getItem('surveyed')) || '';
    if (submittedStatus === 'true') {
        window.location.href = 'https://expo.benfink.nyc/success/';
    }
});

function submitForm() {
    document.getElementById('form-ethnicity').value = document.getElementById('subject-ethnicity').value;
    document.getElementById('form-gender').value = document.getElementById('subject-gender').value;
    document.getElementById('form-religion').value = document.getElementById('subject-religion').value;
    for (let i = 0; i < 10; i++) {
        document.getElementById(`form-guess-${i + 1}`).value = document.getElementById(`guess-${i + 1}`).value;
    }
}

const modError = {
    clearMessage: () => {document.getElementById('error-msg').textContent = '';},
    addMessage: (msg) => {document.getElementById('error-msg').textContent = msg;}
};

async function sendToSpreadsheet() {
    disableSubmit(true);
    if (await verifyTurnstile()) {
        const formData = new FormData(document.getElementById('hidden-form'));
        const email = document.getElementById('user-email').value;
        const parsedEmail = `${email}@ecfs.org`;
        document.getElementById('load-msg').textContent = 'Please wait while we attempt to submit your response. Do not navigate away from this page.';
            if (email && !email.includes('@')) {
                const response = await fetch('https://expo.benfink.nyc:8443/submit-form', {
                    method: 'POST',
                    headers: { 'User-Email': parsedEmail },
                    body: formData
                });
                if (response.ok) {
                    document.getElementById('load-msg').textContent = '';
                    localStorage.setItem('surveyed', JSON.stringify('true'));
                    disableSubmit(false);
                    window.location.href = 'https://expo.benfink.nyc/success/';
                } else if (response.status === 409 || response.status === 400) {
                    document.getElementById('load-msg').textContent = '';
                    modError.addMessage('The email you provided cannot be used.');
                    turnstile.reset('#turnstile-container');
                    setTimeout(() => {
                        modError.clearMessage()
                    }, 2000);
                    disableSubmit(false);
                } else if (response.status === 500) {
                    document.getElementById('load-msg').textContent = '';
                    disableSubmit(false);
                    window.location.href = 'https://expo.benfink.nyc/error/';
                }
            }
    } else {
        modError.addMessage('Invalid token.');
        turnstile.reset('#turnstile-container');
        setTimeout(() => {
            modError.clearMessage();
        }, 2000);
        disableSubmit(false);
    }
}

function sendFromButton() {
    document.getElementById('load-status').style.display = 'flex';
    document.getElementById('load-msg').textContent = 'We are verifying the validity of this submission with Cloudflare. Do not navigate away from this page.';
    sendToSpreadsheet().then(() => {document.getElementById('load-status').style.display = 'none';});
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

window.onloadTurnstileCallback = function () {
    turnstile.render("#turnstile-container", {
        sitekey: "0x4AAAAAABBwUgg2EfVj7bzt",
        callback: (token) => {
            loadToken(token)
        }
    });
};

function disableSubmit(condition) {
    const button = document.getElementById('final-submit');
    if (condition) {
        button.disabled = true;
        button.classList.add('disabled');
    } else {
        button.disabled = false;
        button.classList.remove('disabled');
    }
}

function disablePlay(button, condition) {
    if (condition) {
        button.disabled = true;
        button.textContent = 'Playing...'
        button.classList.add('play-disabled');
    } else {
        button.disabled = false;
        button.textContent = 'Play';
        button.classList.remove('play-disabled');
    }
}

function isSafari() {
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

if (isSafari()) {
    document.querySelectorAll('select').forEach((item) => {
        item.style.webkitAppearance = 'none';
    });
}

document.getElementById('subject-religion').addEventListener('change', () => {
    if (document.getElementById('subject-religion').value === 'other-religion') {
        document.getElementById('eth-container').style.display = 'block';
        document.getElementById('subject-ethnicity').value = '';
    } else {
        document.getElementById('eth-container').style.display = 'none';
        document.getElementById('subject-ethnicity').value = 'n/a';
    }
});