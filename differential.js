const numerInput = document.getElementById('numerator');
const denomInput = document.getElementById('denominator');
const methodSelect = document.getElementById('method');
const resultDiv = document.getElementById('result');
const computeButton = document.getElementById('computeButton');
const exampleButtons = document.querySelectorAll('.exampleBtn');

function nodeToTex(node) {
  try {
    return node.toTex({ parenthesis: 'auto' });
  } catch (e) {
    return node.toString();
  }
}

function buildExpression() {
  const num = numerInput.value.trim();
  const den = denomInput.value.trim();
  if (!num) {
    return '1';
  }
  if (!den) {
    return num;
  }
  return '(' + num + ')/(' + den + ')';
}

function wrapMath(tex) {
  return '<div class="math-display">\\[' + tex + '\\]</div>';
}

function simplifyText(text) {
  return text.replace(/\*\*/g, '^');
}

function isPureProduct(node) {
  return node.isOperatorNode && node.op === '*' && node.args.every(arg => !(arg.isOperatorNode && arg.op === '/'));
}

function productRuleExpression(node) {
  const terms = node.args.map((arg, idx) => {
    const derived = math.derivative(arg, 'x');
    const derivedTex = derived.toTex({ parenthesis: 'auto' });
    const othersTex = node.args
      .filter((_, i) => i !== idx)
      .map(item => '(' + item.toTex({ parenthesis: 'auto' }) + ')')
      .join('\\cdot ');
    return derivedTex + (othersTex ? ' \\cdot ' + othersTex : '');
  });
  return terms.join(' + ');
}

function buildLogExpression(node) {
  if (node.isOperatorNode) {
    if (node.op === '*') {
      return node.args.map(buildLogExpression).join(' + ');
    }
    if (node.op === '/') {
      return buildLogExpression(node.args[0]) + ' - ' + buildLogExpression(node.args[1]);
    }
    if (node.op === '^') {
      const baseTex = node.args[0].toTex({ parenthesis: 'auto' });
      const exponentTex = node.args[1].toTex({ parenthesis: 'auto' });
      return exponentTex + ' \\ln\\left|' + baseTex + '\\right|';
    }
  }
  if (node.isFunctionNode && node.fn.name === 'log') {
    const argTex = node.args[0].toTex({ parenthesis: 'auto' });
    return '\\ln\\left|' + argTex + '\\right|';
  }
  const nodeTex = node.toTex({ parenthesis: 'auto' });
  return '\\ln\\left|' + nodeTex + '\\right|';
}

function diffLog(node) {
  if (node.isOperatorNode) {
    if (node.op === '*') {
      return node.args
        .map(arg => '\\frac{' + math.derivative(arg, 'x').toTex({ parenthesis: 'auto' }) + '}{' + arg.toTex({ parenthesis: 'auto' }) + '}')
        .join(' + ');
    }
    if (node.op === '/') {
      const a = node.args[0];
      const b = node.args[1];
      return '\\frac{' + math.derivative(a, 'x').toTex({ parenthesis: 'auto' }) + '}{' + a.toTex({ parenthesis: 'auto' }) + '} - \\frac{' + math.derivative(b, 'x').toTex({ parenthesis: 'auto' }) + '}{' + b.toTex({ parenthesis: 'auto' }) + '}';
    }
    if (node.op === '^') {
      const baseTex = node.args[0].toTex({ parenthesis: 'auto' });
      const exponent = node.args[1];
      if (exponent.isConstantNode) {
        return exponent.toTex({ parenthesis: 'auto' }) + ' \\frac{' + math.derivative(base, 'x').toTex({ parenthesis: 'auto' }) + '}{' + baseTex + '}';
      }
      const term1 = math.derivative(exponent, 'x').toTex({ parenthesis: 'auto' }) + ' \\ln(' + baseTex + ')';
      const term2 = exponent.toTex({ parenthesis: 'auto' }) + ' \\frac{' + math.derivative(base, 'x').toTex({ parenthesis: 'auto' }) + '}{' + baseTex + '}';
      return term1 + ' + ' + term2;
    }
  }
  return '\\frac{' + math.derivative(node, 'x').toTex({ parenthesis: 'auto' }) + '}{' + node.toTex({ parenthesis: 'auto' }) + '}';
}

function renderResult(expression) {
  resultDiv.innerHTML = '';
  try {
    const node = math.parse(expression);
    const derivativeNode = math.derivative(node, 'x');
    let derivative;
    try {
      derivative = math.simplify(derivativeNode);
    } catch (err) {
      derivative = derivativeNode;
    }
    const yFormula = '|y| = |' + node.toString() + '|';

    resultDiv.innerHTML += '<div class="step-block"><p class="step-title">入力関数</p>' + wrapMath('\\left|y\\right| = \\left|' + node.toTex({ parenthesis: 'auto' }) + '\\right|') + '</div>';

    const method = methodSelect.value;

    if (method === 'normal') {
      const derivativeExpr = isPureProduct(node) ? productRuleExpression(node) : derivative.toTex({ parenthesis: 'auto' });
      resultDiv.innerHTML += '<div class="step-block"><p class="step-title">普通の微分</p>' + wrapMath('\\frac{dy}{dx} = ' + derivativeExpr) + '</div>';
    } else {
      if (isPureProduct(node)) {
        const productDerivative = productRuleExpression(node);
        resultDiv.innerHTML += '<div class="step-block"><p class="step-title">積の微分法</p>' + wrapMath('\\frac{dy}{dx} = ' + productDerivative) + '</div>';
      } else {
        const logY = '\\ln \\left|' + node.toTex({ parenthesis: 'auto' }) + '\\right| = ' + buildLogExpression(node);
        const diffLogY = "\\frac{d}{dx}\\left(\\ln \\left|y\\right|\\right) = " + diffLog(node);
        const yPrime = "\\frac{dy}{dx} = y \\cdot \\left(\\frac{d}{dx}\\left(\\ln \\left|y\\right|\\right)\\right)";
        const derivativeFormula = "\\frac{dy}{dx} = \\left|" + node.toTex({ parenthesis: 'auto' }) + "\\right| \\cdot (" + diffLog(node) + ")";

        resultDiv.innerHTML += '<div class="step-block"><p class="step-title">対数変換</p>' + wrapMath(logY) + '</div>';
        resultDiv.innerHTML += '<div class="step-block"><p class="step-title">対数微分</p>' + wrapMath(diffLogY) + '</div>';
        resultDiv.innerHTML += '<div class="step-block"><p class="step-title">元に戻す</p>' + wrapMath(yPrime) + wrapMath(derivativeFormula) + '</div>';
      }
    }

    resultDiv.innerHTML += '<div class="final-answer"><p class="step-title">答え</p>' + wrapMath('\\frac{dy}{dx} = ' + derivative.toTex({ parenthesis: 'auto' })) + '</div>';
    if (window.MathJax && MathJax.typesetPromise) {
      MathJax.typesetPromise([resultDiv]);
    }
  } catch (error) {
    resultDiv.textContent = '入力に誤りがあります。式を確認してください。\n' + error.message;
  }
}

computeButton.addEventListener('click', () => renderResult(buildExpression()));
exampleButtons.forEach(button => {
  button.addEventListener('click', () => {
    numerInput.value = button.dataset.num || '';
    denomInput.value = button.dataset.den || '';
    renderResult(buildExpression());
  });
});

methodSelect.addEventListener('change', () => renderResult(buildExpression()));

renderResult(buildExpression());
