import Foundation
import Vision
import ImageIO

struct Line: Encodable {
    let text: String
    let confidence: Float
    let box: [Double]
}

guard CommandLine.arguments.count == 2 else { exit(2) }
let url = URL(fileURLWithPath: CommandLine.arguments[1])
let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.recognitionLanguages = ["pt-BR", "en-US"]
request.usesLanguageCorrection = false
do {
    try VNImageRequestHandler(url: url, options: [:]).perform([request])
    let lines = (request.results ?? []).compactMap { item -> Line? in
        guard let candidate = item.topCandidates(1).first else { return nil }
        let rect = item.boundingBox
        return Line(text: candidate.string, confidence: candidate.confidence,
                    box: [rect.minX, 1-rect.maxY, rect.maxX, 1-rect.minY])
    }
    FileHandle.standardOutput.write(try JSONEncoder().encode(lines))
} catch {
    FileHandle.standardError.write(Data("OCR local não concluiu.\n".utf8))
    exit(1)
}
