

import { initializeApp } from "https://gstatic.com";
import { getFirestore, collection, addDoc, getDocs } from "https://gstatic.com";

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD6hW-h6KXVisz31RRcq4mMZWMoW3bgAKk",
  authDomain: "feras-taekwondo.firebaseapp.com",
  projectId: "feras-taekwondo",
  storageBucket: "feras-taekwondo.firebasestorage.app",
  messagingSenderId: "455229820465",
  appId: "1:455229820465:web:86ff24d82efb7b842c0f10"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const video = document.getElementById('webcam');
const statusTxt = document.getElementById('status');
let modelosProntos = false;

// Inicializa os arquivos de modelos de IA e a câmera do aparelho
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
        statusTxt.innerText = "Erro ao acessar câmera ou carregar IA.";
    }
}

// Executa o mapeamento e salva o registro numérico do rosto
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
        await addDoc(collection(db, "feras_alunos"), {
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

// Analisa quem está na câmera e salva a presença se reconhecido
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
        const snapshot = await getDocs(collection(db, "feras_alunos"));
        let correspondencia = null;
        let menorDistancia = 0.55; // Limite padrão de precisão

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
            await addDoc(collection(db, "feras_presencas"), {
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

// Verifica data de aniversário e ativa efeitos especiais visuais
function parabenizarSeAniversario(dataNascimento, nome) {
    const hoje = new Date();
    const nasc = new Date(dataNascimento);
    
    if (hoje.getDate() === nasc.getUTCDate() && hoje.getMonth() === nasc.getUTCMonth()) {
        statusTxt.innerText = `🎉 PARABÉNS, ${nome.toUpperCase()}! 🎉`;
        
        // Efeito cascata de confetes laterais
        let fim = Date.now() + (4 * 1000);
        (function dispararLet() {
            confetti({ particleCount: 6, angle: 60, spread: 50, origin: { x: 0 } });
            confetti({ particleCount: 6, angle: 120, spread: 50, origin: { x: 1 } });
            if (Date.now() < fim) { requestAnimationFrame(dispararLet); }
        }());
        
        alert(`🎂 Parabéns, ${nome}! Feliz Aniversário da equipe Feras Taekwondo! 🥳🥋`);
    }
}

// Vincula as funções JavaScript aos cliques dos botões na tela
document.getElementById('btnMatricular').addEventListener('click', cadastrarAtleta);
document.getElementById('btnVerificar').addEventListener('click', baterPresenca);

// Inicializa a IA ao abrir o sistema
iniciarSistema();