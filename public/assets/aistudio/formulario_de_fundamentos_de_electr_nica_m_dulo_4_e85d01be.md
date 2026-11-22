# Base de Conocimientos: Fundamentos de Electrónica (Módulo 4)

Este documento consolida las fórmulas, constantes físicas y modelos matemáticos correspondientes al **Módulo de Aprendizaje #4: Fundamentos de Electrónica** (Semanas 14 y 15) del curso de **Física Aplicada (815972)**, basado en el texto obligatorio *Boylestad & Nashelsky (Electrónica: teoría de circuitos y dispositivos electrónicos)*.

---

## 1. Física de Semiconductores y Diodo Unión PN (Semana 14)

### Constantes Físicas y Potencial de Barrera ($V_K$ o $V_D$)
* **Carga del electrón ($q$):**
  $$q = 1.6 \times 10^{-19}\text{ C}$$
* **Constante de Boltzmann ($k$):**
  $$k = 1.38 \times 10^{-23}\text{ J/K} = 8.617 \times 10^{-5}\text{ eV/K}$$
* **Potencial de barrera típico a temperatura ambiente ($T = 300\text{ K}$):**
  * **Silicio ($\text{Si}$):** $V_K \approx 0.7\text{ V}$ (Ancho de banda prohibida $E_g = 1.1\text{ eV}$)
  * **Germanio ($\text{Ge}$):** $V_K \approx 0.3\text{ V}$ (Ancho de banda prohibida $E_g = 0.67\text{ eV}$)
  * **Arseniuro de Galio ($\text{GaAs}$):** $V_K \approx 1.2\text{ V}$ (Ancho de banda prohibida $E_g = 1.43\text{ eV}$)

### Ley de Acción de Masas y Concentración de Portadores
* **Concentración intrínseca ($n_i$):**
  $$n \cdot p = n_i^2$$
  *(Donde $n$ es la concentración de electrones libres y $p$ es la concentración de huecos).*
* **Semiconductor Extrínseco Tipo N (dopado con átomos donadores $N_D$):**
  $$n_n \approx N_D \quad \implies \quad p_n = \frac{n_i^2}{N_D}$$
* **Semiconductor Extrínseco Tipo P (dopado con átomos aceptoras $N_A$):**
  $$p_p \approx N_A \quad \implies \quad n_p = \frac{n_i^2}{N_A}$$

### Ecuación del Diodo de Shockley (Curva Característica $I\text{-}V$)
* **Corriente del diodo ($I_D$):**
  $$I_D = I_S \left( e^{\frac{V_D}{n V_T}} - 1 \right)$$
  *(Donde $I_S$ es la corriente de saturación inversa, $V_D$ es el voltaje aplicado en los terminales del diodo y $n$ es el factor de idealidad: $n = 1$ para $\text{Ge}$ y $n \approx 1\text{ a }2$ para $\text{Si}$).*
* **Voltaje Térmico ($V_T$):**
  $$V_T = \frac{k T}{q}$$
  *(A temperatura ambiente de $T = 300\text{ K}$ ($27^\circ\text{C}$), $V_T \approx 25.85\text{ mV} \approx 26\text{ mV}$).*
* **Variación de la corriente de saturación inversa ($I_S$) con la temperatura:**
  * $I_S$ se duplica aproximadamente por cada incremento de $10^\circ\text{C}$ en la temperatura.
  * El voltaje de umbral ($V_K$) disminuye aproximadamente $2\text{ mV}$ (o $2.5\text{ mV}$) por cada incremento de $1^\circ\text{C}$.

### Resistencia del Diodo
* **Resistencia estática o de CD ($R_D$):**
  $$R_D = \frac{V_D}{I_D}$$
* **Resistencia dinámica o de CA ($r_d$):**
  $$r_d = \frac{\Delta V_D}{\Delta I_D} = \frac{n V_T}{I_D}$$
  *(Para $n = 1$ a $300\text{ K}$: $r_d \approx \frac{26\text{ mV}}{I_D}$).*

---

## 2. Modelos del Diodo y Circuitos Rectificadores (Semana 15)

### Modelos Equivalentes del Diodo en CD
1. **Modelo Ideal:**
   * Polarización directa ($V_D \ge 0$): Cortocircuito ($V_D = 0\text{ V}$, $R_f = 0\,\Omega$).
   * Polarización inversa ($V_D < 0$): Circuito abierto ($I_D = 0\text{ A}$, $R_r = \infty\,\Omega$).
2. **Modelo Simplificado (Primera aproximación práctica):**
   * Polarización directa: Fuente de tensión constante $V_D = V_K$ ($0.7\text{ V}$ para $\text{Si}$).
   * Polarización inversa: Circuito abierto ($I_D = 0\text{ A}$).
3. **Modelo Lineal por Tramos (Con resistencia interna $r_{\text{av}}$):**
   $$V_D = V_K + I_D r_{\text{av}}$$

### Circuitos Rectificadores (Entrada senoidal $v_i(t) = V_m \sin(\omega t)$)

#### A. Rectificador de Media Onda (1 Diodo)
* **Voltaje pico de salida ($V_{m,\text{sal}}$):**
  * Diodo ideal: $V_{m,\text{sal}} = V_m$
  * Diodo práctico ($\text{Si}$): $V_{m,\text{sal}} = V_m - V_K$
* **Voltaje promedio o de CD ($V_{\text{CD}}$ o $V_{\text{prom}}$):**
  $$V_{\text{CD}} = \frac{V_{m,\text{sal}}}{\pi} \approx 0.318 \, V_{m,\text{sal}}$$
* **Voltaje eficaz o RMS de salida ($V_{\text{rms}}$):**
  $$V_{\text{rms}} = \frac{V_{m,\text{sal}}}{2} = 0.5 \, V_{m,\text{sal}}$$
* **Voltaje Pico Inverso (PIV o PRV):**
  $$\text{PIV} \ge V_m$$

#### B. Rectificador de Onda Completa tipo Puente (4 Diodos)
* **Voltaje pico de salida ($V_{m,\text{sal}}$):**
  * Diodos ideales: $V_{m,\text{sal}} = V_m$
  * Diodos prácticos ($\text{Si}$, conducen 2 por semiciclo): $V_{m,\text{sal}} = V_m - 2V_K$
* **Voltaje promedio o de CD ($V_{\text{CD}}$):**
  $$V_{\text{CD}} = \frac{2 V_{m,\text{sal}}}{\pi} \approx 0.636 \, V_{m,\text{sal}}$$
* **Voltaje eficaz o RMS de salida ($V_{\text{rms}}$):**
  $$V_{\text{rms}} = \frac{V_{m,\text{sal}}}{\sqrt{2}} \approx 0.707 \, V_{m,\text{sal}}$$
* **Frecuencia de salida ($f_{\text{sal}}$):**
  $$f_{\text{sal}} = 2 f_{\text{red}}$$
* **Voltaje Pico Inverso (PIV) por cada diodo:**
  $$\text{PIV} \ge V_{m,\text{sal}} + V_K \quad (\text{o } \text{PIV} \ge V_m \text{ en análisis ideal})$$

#### C. Rectificador de Onda Completa con Transformador con Derivación Central (2 Diodos)
*(Donde $V_m$ es el voltaje pico de cada mitad del devanado secundario).*
* **Voltaje pico de salida ($V_{m,\text{sal}}$):**
  $$V_{m,\text{sal}} = V_m - V_K$$
* **Voltaje promedio o de CD ($V_{\text{CD}}$):**
  $$V_{\text{CD}} = \frac{2 V_{m,\text{sal}}}{\pi} \approx 0.636 \, V_{m,\text{sal}}$$
* **Voltaje Pico Inverso (PIV) por cada diodo:**
  $$\text{PIV} \ge 2 V_{m,\text{sal}} + V_K \approx 2 V_m$$

---

## 3. Filtrado Capacitivo y Regulación con Diodo Zener (Semana 15)

### Filtrado con Capacitor (Aproximación Lineal de Descarga)
* **Voltaje de rizo pico a pico ($V_{r(\text{pp})}$):**
  $$V_{r(\text{pp})} \approx \frac{I_{\text{CD}}}{f_{\text{sal}} C} = \frac{V_{m,\text{sal}}}{f_{\text{sal}} R_L C}$$
  *(Donde $f_{\text{sal}} = f$ para media onda y $f_{\text{sal}} = 2f$ para onda completa; $R_L$ es la resistencia de carga).*
* **Voltaje de rizo eficaz o RMS ($V_{r(\text{rms})}$):**
  $$V_{r(\text{rms})} = \frac{V_{r(\text{pp})}}{2\sqrt{3}} \approx 0.289 \, V_{r(\text{pp})}$$
* **Voltaje de CD filtrado en la carga ($V_{\text{CD}}$):**
  $$V_{\text{CD}} = V_{m,\text{sal}} - \frac{V_{r(\text{pp})}}{2}$$
* **Factor de rizo ($r$):**
  $$r = \frac{V_{r(\text{rms})}}{V_{\text{CD}}} \times 100\%$$

### Regulador de Voltaje con Diodo Zener
Para un circuito regulador básico con resistencia limitadora en serie ($R_S$), fuente de entrada ($V_i$), diodo Zener ($V_Z$) y carga ($R_L$):

* **Condición de encendido del Zener (Estado ON):**
  $$V_L = \frac{R_L}{R_S + R_L} V_i \ge V_Z$$
* **Voltaje en la carga (cuando el Zener está en región de ruptura):**
  $$V_L = V_Z$$
* **Corriente a través de la resistencia serie ($I_R$):**
  $$I_R = \frac{V_i - V_Z}{R_S}$$
* **Corriente en la carga ($I_L$):**
  $$I_L = \frac{V_Z}{R_L}$$
* **Ley de Corrientes de Kirchhoff en el nodo Zener:**
  $$I_R = I_Z + I_L \quad \implies \quad I_Z = I_R - I_L$$
* **Potencia disipada por el diodo Zener ($P_Z$):**
  $$P_Z = V_Z I_Z \le P_{Z\text{máx}}$$
* **Rango de operación segura del Zener ($I_{ZK} \le I_Z \le I_{ZM}$):**
  * **Corriente máxima permitida ($I_{ZM}$):** $I_{ZM} = \frac{P_{Z\text{máx}}}{V_Z}$
  * **Resistencia mínima de carga ($R_{L\text{mín}}$):** $R_{L\text{mín}} = \frac{R_S V_Z}{V_i - V_Z}$ *(para $I_{ZK} \approx 0$)*
  * **Resistencia máxima de carga ($R_{L\text{máx}}$):** $R_{L\text{máx}} = \frac{V_Z}{I_R - I_{ZM}}$