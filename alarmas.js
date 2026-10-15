const elementoReloj = document.getElementById("reloj");  //busca el control por su nombre y se guarda en una constante

/*Elementos que se van a usar*/
const campoHora = document.getElementById("hora-alarma");
const mensajeError = document.getElementById("mensaje-error");
const listaAlarmas = document.getElementById("lista-alarmas");
const formulario = document.getElementById("formulario-alarma");

let alarmas = []; //Arreglos con las alarmas
let siguienteId = 1; //Contador para asignar id unico a las alarmas para despues poder editar

const botonGuardar = document.getElementById("boton-guardar");
const botonCancelar = document.getElementById("boton-cancelar");

let idEnEdicion = null;

const botonDetener = document.getElementById("boton-detener"); //Boton para detener alarma

let contextoAudio = null;  //Genera audio, pero inicia en null por que se crea luego
let intervaloSonido = null; //Guarda el temporizador que repite el sonido
let alarmaSonando = false; //indica si hay alarmas sonando

function dosDigitos(numero) {  //convierte numero a texto, si solo es un digito agrega un 0 al inicio
    return String(numero).padStart(2, "0");
}

function obtenerHoraActual() {  //Crea objeto Date que representa la hora actual en 24h
    const ahora = new Date();
    return dosDigitos(ahora.getHours()) + ":" + dosDigitos(ahora.getMinutes()) + ":" + dosDigitos(ahora.getSeconds());
}

function actualizarReloj() {  //escribe la hora dentro de textContent (label), antes verifica que esté bien la hora
    if (!elementoReloj) {
        console.error("Clock element not found");
        return;
    }
    const hora = obtenerHoraActual(); //Se guarda la hora en una variable
    elementoReloj.textContent = hora;
    revisarAlarmas(hora.slice(0, 5)); //Toma los primeros 5 caracteres: hh:mm  05:50
}

actualizarReloj(); //Se llama D1 para mostrar la hora de inmediato
setInterval(actualizarReloj, 1000); //Se repite cada 1000 milisegundos

function mostrarError(texto) {  //Muestra error en el campo asigando
    mensajeError.textContent = texto;
}

function validarHora(valor) { //valida las horas, devolviedo errores si los hay
    const formatoValido = /^([01]\d|2[0-3]):[0-5]\d$/; //horas de 00 a 23 y minutos entre 00-59
    if (!valor) {
        return "Please enter a time";
    }
    if (!formatoValido.test(valor)) { //Tenga el formato HH:MM
        return "The time must have the format HH:MM";
    }

    const repetida = alarmas.some(function (alarma) { //que no este repetida
        return alarma.hora === valor && alarma.id !== idEnEdicion;
    });
    if (repetida) {
        return "There is already an alarm at that time";
    }
    return "";
}

function dibujarLista() { //Muetra las alarmas nuevas, luego de haber limpiado la lista con .innerHTML = ""
    listaAlarmas.innerHTML = "";
    if (alarmas.length === 0) {
        const vacio = document.createElement("li");
        vacio.textContent = "No alarm yet";
        listaAlarmas.appendChild(vacio);
        return; //si no hay alarmas muestra No alarms yet y retorna
    }
    alarmas.forEach(function (alarma) { //Cada alarma se crea con checkbox, hora y boton de borrar
        const elemento = document.createElement("li");

        const interruptor = document.createElement("input");
        interruptor.type = "checkbox";
        interruptor.checked = alarma.activa;
        interruptor.addEventListener("change", function () {
            cambiarEstado(alarma.id, interruptor.checked);
        });

        const texto = document.createElement("span");
        texto.textContent = " " + alarma.hora + " ";

        const botonEditar = document.createElement("button");
        botonEditar.type = "button";
        botonEditar.textContent = "Edit";
        botonEditar.addEventListener("click", function () {
            comenzarEdicion(alarma.id);
        });

        const botonBorrar = document.createElement("button");
        botonBorrar.type = "button";
        botonBorrar.textContent = "Delete";
        botonBorrar.classList.add("borrar")
        botonBorrar.addEventListener("click", function () {
            borrarAlarma(alarma.id);
        });

        elemento.appendChild(interruptor);
        elemento.appendChild(texto);
        elemento.appendChild(botonEditar);
        elemento.appendChild(botonBorrar);
        listaAlarmas.appendChild(elemento);
    });
}

function ordenarAlarmas() {
    alarmas.sort(function (a, b) {
        return a.hora.localeCompare(b.hora);
    });
}

function agregarAlarma(hora) { //crea el objeto de la alarma con su id, hora, y estado
    alarmas.push({ id: siguienteId, hora: hora, activa: true, yaSono: false});
    siguienteId++;

    ordenarAlarmas();
    dibujarLista();
}

function prepararAudio() { //
    if (contextoAudio) {
        return;
    }
    const ClaseAudio = window.AudioContext || window.webkitAudioContext;
    if (!ClaseAudio) {
        console.error("Web Audio API is not supported in this browser");
        return;
    }
    contextoAudio = new ClaseAudio();
}

function emitirPitido() { //reproduce un pitido. Con un oscilador(sonido), volumen (bajarlo para que no sea molesto) y destination (salida de audio)
    if (!contextoAudio) {
        return;
    }
    if (contextoAudio.state === "suspended") {
        contextoAudio.resume();
    }
    const oscilador = contextoAudio.createOscillator();
    const volumen = contextoAudio.createGain();
    oscilador.type = "sine";
    oscilador.frequency.value = 880;
    volumen.gain.value = 0.2;
    oscilador.connect(volumen);
    volumen.connect(contextoAudio.destination);
    oscilador.start();
    oscilador.stop(contextoAudio.currentTime + 0.3);
}

function activarAlarma() {  //activa alarma poniendo estado "sonando". Agrega boton stop. setInterval repite el pitido cada 700ms
    if (alarmaSonando) {    //evita arrancar si ya esta en ejecucion
        return;
    }
    alarmaSonando = true;
    elementoReloj.classList.add("sonando");
    botonDetener.hidden = false;
    emitirPitido();
    intervaloSonido = setInterval(emitirPitido, 700);
}

function detenerAlarma() { //quita la clase, oculta el boton y cancela el temporizador
    alarmaSonando = false;
    elementoReloj.classList.remove("sonando");
    botonDetener.hidden = true;
    clearInterval(intervaloSonido);
    intervaloSonido = null;
}
botonDetener.addEventListener("click", detenerAlarma);

function revisarAlarmas(horaMinuto) { //Si la hora de la alarma actual no coincide con la hora actual le borra el estado yaSono y queda para el dia siguiente
                                      //Si coincide, esta activa y aun no ha sonado la marca y activa
    alarmas.forEach(function (alarma) {
        if (alarma.hora !== horaMinuto) {
            alarma.yaSono = false;
            return;
        }
        if (alarma.activa && !alarma.yaSono) {
            alarma.yaSono = true;
            activarAlarma();
        }
    });
}

formulario.addEventListener("submit", function (evento) { //la funcion se ejecuta al enviar formulario
    evento.preventDefault();//evita recargar la pagina
    prepararAudio();
    const valor = campoHora.value;
    const error = validarHora(valor);
    if (error) {
        mostrarError(error);
        return;//retorna si hay error
    }//si todo esta bien se limpia el mensaje, se agrega la alarma y se vacia el campo
    
    mostrarError("");

    if (idEnEdicion !== null) {
        guardarEdicion(valor);
    } else {
        agregarAlarma(valor);
    }
    campoHora.value = "";
});

dibujarLista();

function borrarAlarma(id) { //Borra alarma por id
    if (id === idEnEdicion) {
        terminarEdicion();
    }

    alarmas = alarmas.filter(function (alarma) {
        return alarma.id !== id;
    });
    dibujarLista();
}

function buscarAlarma(id) { //busqueda por id
    return alarmas.find(function (item) {
        return item.id === id;
    });
}

function comenzarEdicion(id) { //busca la alarma, guarda el id copia su hora al campo del formulario, cambia el texto del botón, muestra el botón de cancelar
    const alarma = buscarAlarma(id);
    if (!alarma) {
        console.error("Alarm not found: " + id);
        return;
    }
    idEnEdicion = id;
    campoHora.value = alarma.hora;
    botonGuardar.textContent = "Save changes";
    botonCancelar.hidden = false;
    mostrarError("");
    campoHora.focus();
}

function terminarEdicion() { //deja el formulario como estaba: sin alarma en edición
    idEnEdicion = null;
    campoHora.value = "";
    botonGuardar.textContent = "Add alarm";
    botonCancelar.hidden = true;
    mostrarError("");
}

function guardarEdicion(hora) { //busca la alarma en edición, le cambia la hora, reordena la lista, restaura el formulario y redibuja
    const alarma = buscarAlarma(idEnEdicion);
    if (!alarma) {
        console.error("Alarm not found: " + idEnEdicion);
        terminarEdicion();
        return;
    }
    alarma.hora = hora;
    alarma.yaSono = false;
    ordenarAlarmas();
    terminarEdicion();
    dibujarLista();
}

botonCancelar.addEventListener("click", terminarEdicion);

function cambiarEstado(id, activa) { //busca la alarma con find
    const alarma = alarmas.find(function (item) {
        return item.id === id;
    });
    if (!alarma) {
        console.error("Alarm not found: " + id);
        return;
    }
    alarma.activa = activa;
}