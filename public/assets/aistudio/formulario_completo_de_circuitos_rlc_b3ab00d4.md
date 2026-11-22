# Formulario Completo de Circuitos RLC

Este documento recopila las ecuaciones fundamentales para el análisis de circuitos **RLC** (Resistor, Inductor, Capacitor) tanto en régimen permanente senoidal (Corriente Alterna) como en régimen transitorio (respuesta natural y al escalón).

## 1. Elementos Pasivos e Impedancias (Régimen Senoidal / CA)

* **Frecuencia angular (**$\omega$**):**
  

  $$
  \omega = 2\pi f \quad [\text{rad/s}]
  $$

### Resistor ($R$)

* **Relación en el tiempo:** $v(t) = R \cdot i(t)$

* **Impedancia compleja:** $Z_R = R$

* **Desfase (**$V$ **respecto a** $I$**):** $0^\circ$ (en fase)

### Inductor ($L$)

* **Relación en el tiempo:** $v(t) = L \frac{di(t)}{dt}$

* **Reactancia inductiva:** $X_L = \omega L = 2\pi f L$

* **Impedancia compleja:** $Z_L = j X_L = j\omega L$

* **Desfase (**$V$ **respecto a** $I$**):** $+90^\circ$ ($V$ adelanta a $I$)

### Capacitor ($C$)

* **Relación en el tiempo:** $i(t) = C \frac{dv(t)}{dt}$

* **Reactancia capacitiva:** $X_C = \frac{1}{\omega C} = \frac{1}{2\pi f C}$

* **Impedancia compleja:** $Z_C = -j X_C = \frac{1}{j\omega C}$

* **Desfase (**$V$ **respecto a** $I$**):** $-90^\circ$ ($V$ atrasa a $I$)

## 2. Circuito RLC en Serie (CA)

* **Impedancia total (**$Z$**):**
  

  $$
  Z = R + j(X_L - X_C)
  $$

* **Magnitud de la impedancia (**$\vert{}Z\vert{}$**):**
  

  $$
  \vert{}Z\vert{} = \sqrt{R^2 + (X_L - X_C)^2}
  $$

* **Ángulo de fase (**$\theta$**):**
  

  $$
  \theta = \arctan\left(\frac{X_L - X_C}{R}\right)
  $$

* **Ley de Ohm fasorial:**
  

  $$
  \mathbf{I} = \frac{\mathbf{V}}{Z} \implies I_{\text{max}} = \frac{V_{\text{max}}}{\vert{}Z\vert{}}
  $$

* **Voltajes individuales (magnitudes):**
  

  $$
  V_R = I \cdot R
  $$

  $$
  V_L = I \cdot X_L
  $$

  $$
  V_C = I \cdot X_C
  $$

* **Voltaje total (magnitud):**
  

  $$
  V = \sqrt{V_R^2 + (V_L - V_C)^2}
  $$

## 3. Circuito RLC en Paralelo (CA)

Definiciones auxiliares: Admitancia ($Y = 1/Z$), Conductancia ($G = 1/R$) y Susceptancia ($B = 1/X$).

* **Admitancia total (**$Y$**):**
  

  $$
  Y = G + j(B_C - B_L) = \frac{1}{R} + j\left(\omega C - \frac{1}{\omega L}\right)
  $$

* **Magnitud de la admitancia (**$\vert{}Y\vert{}$**):**
  

  $$
  \vert{}Y\vert{} = \sqrt{\left(\frac{1}{R}\right)^2 + \left(\frac{1}{X_C} - \frac{1}{X_L}\right)^2}
  $$

* **Ángulo de fase (**$\theta$**, de** $I$ **respecto a** $V$**):**
  

  $$
  \theta = \arctan\left(\frac{B_C - B_L}{G}\right) = \arctan\left(R\left(\omega C - \frac{1}{\omega L}\right)\right)
  $$

* **Corrientes individuales (magnitudes):**
  

  $$
  I_R = \frac{V}{R}
  $$

  $$
  I_L = \frac{V}{X_L}
  $$

  $$
  I_C = \frac{V}{X_C}
  $$

* **Corriente total (magnitud):**
  

  $$
  I = \sqrt{I_R^2 + (I_C - I_L)^2}
  $$

## 4. Resonancia y Selectividad

Condición de resonancia: $X_L = X_C$ (en serie) o $B_L = B_C$ (en paralelo).

* **Frecuencia angular de resonancia (**$\omega_0$**):**
  

  $$
  \omega_0 = \frac{1}{\sqrt{LC}}
  $$

* **Frecuencia lineal de resonancia (**$f_0$**):**
  

  $$
  f_0 = \frac{1}{2\pi\sqrt{LC}}
  $$

* **Factor de Calidad (**$Q$**):**

  * **Circuito RLC Serie:**
    

    $$
    Q = \frac{\omega_0 L}{R} = \frac{1}{\omega_0 R C} = \frac{1}{R}\sqrt{\frac{L}{C}}
    $$

  * **Circuito RLC Paralelo:**
    

    $$
    Q = \frac{R}{\omega_0 L} = \omega_0 R C = R\sqrt{\frac{C}{L}}
    $$

* **Ancho de banda (**$BW$ **o** $\Delta\omega$**):**
  

  $$
  BW = \omega_2 - \omega_1 = \frac{\omega_0}{Q}
  $$

  * **RLC Serie:** $BW = \frac{R}{L} \quad [\text{rad/s}] \implies \Delta f = \frac{R}{2\pi L} \quad [\text{Hz}]$

  * **RLC Paralelo:** $BW = \frac{1}{RC} \quad [\text{rad/s}] \implies \Delta f = \frac{1}{2\pi RC} \quad [\text{Hz}]$

* **Frecuencias de corte o de media potencia (**$\omega_1, \omega_2$**):**
  

  $$
  \omega_{1,2} = \mp \frac{BW}{2} + \sqrt{\left(\frac{BW}{2}\right)^2 + \omega_0^2}
  $$

  * **Aproximación para circuitos de alto factor de calidad (**$Q \ge 10$**):**
    

    $$
    \omega_{1,2} \approx \omega_0 \mp \frac{BW}{2}
    $$

## 5. Potencia en Circuitos RLC (CA)

* **Potencia Activa o Real (**$P$**, en Watts** $[\text{W}]$**):**
  

  $$
  P = V_{\text{rms}} I_{\text{rms}} \cos\theta = I_{\text{rms}}^2 R
  $$

* **Potencia Reactiva (**$Q$**, en Volt-Amperes Reactivos** $[\text{VAR}]$**):**
  

  $$
  Q = V_{\text{rms}} I_{\text{rms}} \sin\theta = I_{\text{rms}}^2 (X_L - X_C)
  $$

* **Potencia Aparente (**$S$**, en Volt-Amperes** $[\text{VA}]$**):**
  

  $$
  S = V_{\text{rms}} I_{\text{rms}} = \sqrt{P^2 + Q^2}
  $$

* **Potencia Compleja (**$\mathbf{S}$**):**
  

  $$
  \mathbf{S} = \mathbf{V}_{\text{rms}} \mathbf{I}_{\text{rms}}^* = P + jQ
  $$

* **Factor de Potencia (**$FP$**):**
  

  $$
  FP = \cos\theta = \frac{P}{S} = \frac{R}{\vert{}Z\vert{}}
  $$

## 6. Análisis Transitorio (Respuesta Natural y al Escalón)

* **Ecuación característica:**
  

  $$
  s^2 + 2\alpha s + \omega_0^2 = 0
  $$

* **Frecuencia resonante no amortiguada (**$\omega_0$**):**
  

  $$
  \omega_0 = \frac{1}{\sqrt{LC}}
  $$

* **Factor de amortiguamiento (**$\alpha$**, en Nepers por segundo** $[\text{Np/s}]$**):**

  * **RLC Serie:** $\alpha = \frac{R}{2L}$

  * **RLC Paralelo:** $\alpha = \frac{1}{2RC}$

* **Raíces de la ecuación característica (**$s_{1,2}$**):**
  

  $$
  s_{1,2} = -\alpha \pm \sqrt{\alpha^2 - \omega_0^2}
  $$

### Casos de Amortiguamiento para la Respuesta Natural $x(t)$

*(Donde* $x(t)$ *representa el voltaje* $v(t)$ *o la corriente* $i(t)$*)*

1. **Caso Sobreamortiguado (**$\alpha > \omega_0$**):** Dos raíces reales y distintas ($s_1 \neq s_2$).
   

   $$
   x(t) = A_1 e^{s_1 t} + A_2 e^{s_2 t}
   $$

2. **Caso Críticamente Amortiguado (**$\alpha = \omega_0$**):** Dos raíces reales e iguales ($s_1 = s_2 = -\alpha$).
   

   $$
   x(t) = (A_1 + A_2 t)e^{-\alpha t}
   $$

3. **Caso Subamortiguado (**$\alpha < \omega_0$**):** Raíces complejas conjugadas ($s_{1,2} = -\alpha \pm j\omega_d$).
   

   $$
   x(t) = e^{-\alpha t} \left( B_1 \cos(\omega_d t) + B_2 \sin(\omega_d t) \right)
   $$

   * **Frecuencia natural amortiguada (**$\omega_d$**):**
     

     $$
     \omega_d = \sqrt{\omega_0^2 - \alpha^2}
     $$

### Respuesta Total al Escalón ($t > 0$)

Cuando se aplica una fuente independiente constante en $t > 0$, la respuesta total es la suma del valor en estado estable final $x(\infty)$ y la respuesta natural:

$$
x_{\text{total}}(t) = x(\infty) + x_{\text{natural}}(t)
$$