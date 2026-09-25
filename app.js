// Configurações oficiais do seu projeto Feras Taekwondo 🥋
const firebaseConfig = {
    apiKey: "AIzaSyD6hW-h6kXVisz31RRcq4mWZMOWw3bgAkk",
    authDomain: "://firebaseapp.com",
    projectId: "feras-taekwondo",
    storageBucket: "feras-taekwondo.firebasestorage.app",
    messagingSenderId: "455229820465",
    appId: "1:455229820465:web:86ff24d82efb7b42c0f10"
};

// Inicialização segura do Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const video = document.getElementById('webcam');
const statusTxt = document.getElementById('status');
let modelosProntos = false;

async function iniciarSistema() {
    try {
        statusTxt.innerText = "Carregando inteligência artificial...";
        const MODEL_URL = 'https://github.io';
        
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        
        modelosProntos = true;
        statusTxt.innerText = "IA Carregada. Ativando câmera...";
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "user", width: 640, height: 480 } 
        });
        video.srcObject = stream;
        statusTxt.innerText = "🥋 Feras Taekwondo operacional!";
    } catch (err) {
        console.error(err);
        statusTxt.innerText = "Erro ao acessar câmera. Dê permissão no seu navegador.";
    }
}

async function cadastrarAtleta() {
    const nome = document.getElementById('nomeAluno').value.trim();
    const dataNasc = document.getElementById('dataNascimento').value;

    if (!nome || !dataNasc) {
        alert("Preencha todos os campos do cadastro!");
        return;
    }
    if (!modelosProntos) return;

    statusTxt.innerText = "Escaneando feições faciais...";
    const analise = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
                                 .withFaceLandmarks()
                                 .withFaceDescriptor();

    if (!analise) {
        statusTxt.innerText = "❌ Rosto não detectado. Centralize-se na câmera.";
        return;
    }

    const vetorMatematico = Array.from(analise.descriptor);

    try {
        statusTxt.innerText = "Salvando matrícula única...";
        await db.collection("feras_alunos").add({
            nomeCompleto: nome,
            dataNascimento: dataNasc,
            faceDescriptor: vetorMatematico,
            dataMatricula: new Date().toISOString()
        });
        
        statusTxt.innerText = `✅ Atleta ${nome} matriculado!`;
        document.getElementById('nomeAluno').value = "";
        document.getElementById('dataNascimento').value = "";
    } catch (erro) {
        console.error(erro);
        statusTxt.innerText = "Erro de conexão com o Firebase.";
    }
}

async function baterPresenca() {
    if (!modelosProntos) return;
    statusTxt.innerText = "Buscando identificação facial...";

    const analiseAtual = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
                                      .withFaceLandmarks()
                                      .withFaceDescriptor();

    if (!analiseAtual) {
        statusTxt.innerText = "❌ Alvo não detectado. Olhe firme para a tela.";
        return;
    }

    try {
        const snapshot = await db.collection("feras_alunos").get();
        let correspondencia = null;
        let menorDistancia = 0.55;

        snapshot.forEach((doc) => {
            const dados = doc.data();
            const vetorSalvo = new Float32Array(dados.faceDescriptor);
            const distancia = faceapi.euclideanDistance(analiseAtual.descriptor, vetorSalvo);
            
            if (distancia < menorDistancia) {
                menorDistancia = distancia;
                correspondencia = { id: doc.id, ...dados };
            }
        });

        if (correspondencia) {
            await db.collection("feras_presencas").add({
                alunoId: correspondencia.id,
                nomeAluno: correspondencia.nomeCompleto,
                dataHora: new Date().toISOString(),
                ano: new Date().getFullYear()
            });

            statusTxt.innerText = `Presença confirmada: Oss, ${correspondencia.nomeCompleto}! 🥋`;
            parabenizarSeAniversario(correspondencia.dataNascimento, correspondencia.nomeCompleto);
        } else {
            statusTxt.innerText = "❌ Rosto desconhecido. Cadastre a matrícula primeiro.";
        }
    } catch (erro) {
        console.error(erro);
        statusTxt.innerText = "Falha ao processar presença.";
    }
}

function parabenizarSeAniversario(dataNascimento, nome) {
    const hoje = new Date();
    const nasc = new Date(dataNascimento);
    
    if (hoje.getDate() === nasc.getUTCDate() && hoje.getMonth() === nasc.getUTCMonth()) {
        statusTxt.innerText = `🎉 PARABÉNS, ${nome.toUpperCase()}! 🎉`;
        
        if (typeof confetti === 'function') {
            let fim = Date.now() + (4 * 1000);
            (function dispararLet() {
                confetti({ particleCount: 6, angle: 60, spread: 50, origin: { x: 0 } });
                confetti({ particleCount: 6, angle: 120, spread: 50, origin: { x: 1 } });
                if (Date.now() < fim) { requestAnimationFrame(dispararLet); }
            }());
        }
        
        alert(`🎂 Parabéns, ${nome}! Feliz Aniversário da equipe Feras Taekwondo! 🥳🥋`);
    }
}

document.getElementById('btnMatricular').addEventListener('click', cadastrarAtleta);
document.getElementById('btnVerificar').addEventListener('click', baterPresenca);

iniciarSistema();
