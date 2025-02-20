// HELPER

function htmlEscape(string) {
    return string.replace(/[&"'<>]/g, match => {
        switch (match) {
            case "&":
                return "&amp;";
            case '"':
                return "&quot;";
            case "'":
                return "&#39;";
            case "<":
                return "&lt;";
            case ">":
                return "&gt;";
            default:
                return match;
        }
    });
}

function html(strings, ...args) {
    return strings
        .map((str, i) =>
        i < args.length
            ? str +
            (args[i].__html
                ? [].concat(args[i].__html).join("")
                : htmlEscape(String(args[i])))
            : str
        )
        .join("")
        .trim();
}

function toDigits(num, size = 0) {
    const result = Number.isNaN(num) ? [] : num.toString().split("");
    const padSize = Math.max(0, size - result.length);
    return [...Array(padSize).fill(" "), ...result];
}

function toSize(num) {
    return Number.isNaN(num) ? 0 : num.toString().length;
}

// STYLES

function renderStyles() {
    return html`
        <style>
            :host {
                --roll-duration: 1s;
            }
            .digit {
                overflow: hidden;
                display: inline-flex;
                position: relative;
                text-align: center;
                justify-content: center;
            }
            .value {
                color: transparent;
                position: relative;
            }
            .scale {
                user-select: none;
                position: absolute;
                left: 50%;
                right: 50%;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                flex-direction: column;
                transition: transform var(--roll-duration);
            }
            .scale span:last-child { /* the minus (-) */
                position: absolute;
                bottom: -10%;
            }
            .digit[data-value=" "] .scale { transform: translateY(10%); }
            .digit[data-value="0"] .scale { transform: translateY(0); }
            .digit[data-value="1"] .scale { transform: translateY(-10%); }
            .digit[data-value="2"] .scale { transform: translateY(-20%); }
            .digit[data-value="3"] .scale { transform: translateY(-30%); }
            .digit[data-value="4"] .scale { transform: translateY(-40%); }
            .digit[data-value="5"] .scale { transform: translateY(-50%); }
            .digit[data-value="6"] .scale { transform: translateY(-60%); }
            .digit[data-value="7"] .scale { transform: translateY(-70%); }
            .digit[data-value="8"] .scale { transform: translateY(-80%); }
            .digit[data-value="9"] .scale { transform: translateY(-90%); }
            .digit[data-value="-"] .scale { transform: translateY(-100%); }
        </style>
    `;
}

// RENDER HELPER

function renderDigit(value, index) {
    return html`
        <span class="digit" data-value="${value}" id="digit${index}">
            <span class="scale" aria-hidden="true">
                <span>0</span>
                <span>1</span>
                <span>2</span>
                <span>3</span>
                <span>4</span>
                <span>5</span>
                <span>6</span>
                <span>7</span>
                <span>8</span>
                <span>9</span>
                <span>-</span>
            </span>
            <span class="value">${value}</span>
        </span>
    `;
}

function renderRoot() {
    return html`
        ${{ __html: renderStyles() }}
        <span id="wrapper"> </span>
    `;
}

const renderCallback = ($wrapper, nextState, prevState, size) => {
    render($wrapper, nextState, { ...prevState, size });
};

function render($wrapper, nextState, prevState) {
    const { value, size } = nextState;
    if (size > prevState.size) {
        $wrapper.innerHTML = toDigits(NaN, size).map(renderDigit).join("");
        setTimeout(() => {
            renderCallback($wrapper, nextState, prevState, size);
        }, 23);
    } else {
        toDigits(value, size).forEach((digit, index) => {
            const $digit = $wrapper.querySelector(`#digit${index}`);
            if ($digit) {
                $digit.dataset.value = digit;
                $digit.querySelector(".value").textContent = digit;
            }
        });
    }
}

const observerThreshold = {
    enter: 1,
    exit: 1
}

function observeElementInView(rollingNumberElement, onEnterCallback, onExitCallback) {
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio >= observerThreshold.enter) {
                onEnterCallback(entry.target);
            }
            if (!entry.isIntersecting && entry.intersectionRatio <= observerThreshold.exit && entry.intersectionRatio > 0) {
                onExitCallback(entry.target);
            }
        });
    }, {
        root: null,
        rootMargin: "-150px 0px",
        threshold: [
            observerThreshold.exit,
            observerThreshold.enter
        ],
    });

    observer.observe(rollingNumberElement);
}

// WEB COMPONENT

const INTERNAL = Symbol("INTERNAL");

class RollingNumber extends HTMLElement {
    static get observedAttributes() {
        return ["value"];
    }
    [INTERNAL] = {
        $wrapper: null,
        state: { value: NaN, size: 0 },
        update(payload) {
            if ("value" in payload) {
                const { value } = payload;
                const size = toSize(value);
                const state = { ...this.state, value };
                const nextState = size > this.state.size ? { ...state, size } : state;
                render(this.$wrapper, nextState, this.state);
                this.state = nextState;
            }
        },
        resetValue() {
            const resetValue = Array.from({ length: this.state.size }).fill('0').join('');
            const state = { ...this.state, value: resetValue };
            render(this.$wrapper, state, this.state);
            this.state = state;
        }
    };
    constructor() {
        super();
        const shadow = this.attachShadow({ mode: "open" });
        shadow.innerHTML = renderRoot();
        this[INTERNAL].$wrapper = shadow.getElementById("wrapper");
    }
    get value() {
        return this[INTERNAL].state.value;
    }
    set value(value) {
        this[INTERNAL].update({ value: Number.parseInt(value) });
    }
    attributeChangedCallback(name, _, newValue) {
        if (name === "value") {
            this.value = newValue;
        }
    }
    connectedCallback() {
        if (this.isConnected) {
            const input = this.getAttribute("value") || this.textContent;
            const value = Number.parseInt(input);

            observeElementInView(
                this,
                () => {
                   this[INTERNAL].update({ value });
                },
                () => {
                   this[INTERNAL].resetValue();
                }
            );
        }
    }
}

customElements.define("rolling-number", RollingNumber);

export { RollingNumber };
