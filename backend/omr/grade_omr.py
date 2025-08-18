import os
import json
from typing import Dict, List

import cv2
import numpy as np
import imutils
from imutils import contours
from imutils.perspective import four_point_transform
from pdf2image import convert_from_path
from PIL import Image


# 1. detecção do exame
# 2. transformação de perspectiva
# 3. extração das bolhas
# 4. ordenação das bolhas
# 5. identificação da bolha marcada
# 6. comparação com o answerKey
# 7. geração do PDF corrigido e exportação do JSON


def grade(
    pdf_path: str,
    answer_key: Dict[int, int],
    aluno: str,
    turma: str,
    output_dir: str,
) -> Dict[str, object]:
    """Corrige um exame OMR presente em ``pdf_path``.

    Parameters
    ----------
    pdf_path: str
        Caminho para o PDF com as respostas do aluno.
    answer_key: Dict[int, int]
        Mapeamento entre índice da questão (0-based) e índice da alternativa correta.
    aluno: str
        Identificação do aluno.
    turma: str
        Identificação da turma.
    output_dir: str
        Diretório onde o PDF corrigido e o JSON serão gravados.

    Returns
    -------
    Dict[str, object]
        Dados da correção contendo ``aluno``, ``turma``, ``pontuacao`` e
        ``pdf_corrigido``.
    """

    pages = convert_from_path(pdf_path)
    annotated_images: List[Image.Image] = []
    score = 0
    question_index = 0

    for page in pages:
        # Converter a página em matriz OpenCV
        image = cv2.cvtColor(np.array(page), cv2.COLOR_RGB2BGR)
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        edged = cv2.Canny(blurred, 75, 200)

        cnts = cv2.findContours(edged.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        cnts = imutils.grab_contours(cnts)
        doc_cnt = None
        for c in sorted(cnts, key=cv2.contourArea, reverse=True):
            peri = cv2.arcLength(c, True)
            approx = cv2.approxPolyDP(c, 0.02 * peri, True)
            if len(approx) == 4:
                doc_cnt = approx
                break

        # 1 e 2: detectar e transformar a perspectiva do exame
        if doc_cnt is not None:
            paper = four_point_transform(image, doc_cnt.reshape(4, 2))
            warped = four_point_transform(gray, doc_cnt.reshape(4, 2))
        else:
            paper = image
            warped = gray

        # 3: extrair bolhas via limiarização
        thresh = cv2.threshold(
            warped, 0, 255, cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU
        )[1]

        cnts = cv2.findContours(thresh.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        cnts = imutils.grab_contours(cnts)

        question_cnts = []
        for c in cnts:
            (x, y, w, h) = cv2.boundingRect(c)
            ar = w / float(h)
            if w >= 20 and h >= 20 and 0.9 <= ar <= 1.1:
                question_cnts.append(c)

        # 4: ordenar as bolhas de cima para baixo
        question_cnts = contours.sort_contours(question_cnts, method="top-to-bottom")[0]

        for (q, i) in enumerate(range(0, len(question_cnts), 5)):
            cnts_q = contours.sort_contours(question_cnts[i : i + 5])[0]
            bubbled = None
            for (j, c) in enumerate(cnts_q):
                mask = np.zeros(thresh.shape, dtype="uint8")
                cv2.drawContours(mask, [c], -1, 255, -1)
                mask = cv2.bitwise_and(thresh, thresh, mask=mask)
                total = cv2.countNonZero(mask)
                if bubbled is None or total > bubbled[0]:
                    bubbled = (total, j)

            # 5 e 6: identificar bolha marcada e comparar com gabarito
            correct = answer_key.get(question_index)
            color = (0, 0, 255)
            if bubbled[1] == correct:
                color = (0, 255, 0)
                score += 1

            # destacar a resposta correta e a escolhida
            cv2.drawContours(paper, [cnts_q[correct]], -1, (0, 255, 0), 2)
            cv2.drawContours(paper, [cnts_q[bubbled[1]]], -1, color, 2)

            question_index += 1

        annotated_images.append(Image.fromarray(cv2.cvtColor(paper, cv2.COLOR_BGR2RGB)))

    # 7: gerar PDF corrigido
    os.makedirs(output_dir, exist_ok=True)
    corrected_pdf_path = os.path.join(output_dir, f"{aluno}_{turma}_corrigido.pdf")
    if annotated_images:
        annotated_images[0].save(
            corrected_pdf_path, save_all=True, append_images=annotated_images[1:]
        )

    result = {
        "aluno": aluno,
        "turma": turma,
        "pontuacao": score,
        "pdf_corrigido": corrected_pdf_path,
    }

    json_path = os.path.join(output_dir, f"{aluno}_{turma}_resultado.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    return result
