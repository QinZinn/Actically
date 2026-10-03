import { cardStatus, topicStatus } from "@/lib/progress-policy";
import type {
  UserProfile,
  StudySet,
  Source,
  Concept,
  LearningSession,
  Message,
  PracticeAttempt,
  PracticeEvaluation,
  PracticeDetail,
  Flashcard,
  ReviewPresentation,
  TopicProgress,
  SearchResult,
  ExtractionResult,
  SourceRef,
  ConceptRef,
  Finding,
  SolveResult,
  FeynmanResult,
  BlurtingResult,
} from "@/contracts/dto";
import type { z } from "zod";
import { reviewEventSchema } from "@/contracts/dto";
type ReviewEvent = z.infer<typeof reviewEventSchema>;

const T0 = "2026-10-01T00:00:00Z";
const T1 = "2026-10-02T08:00:00Z";
const T2 = "2026-10-03T10:00:00Z";
const T_NEAR = "2026-10-05T12:00:00Z";

export const userProfile: UserProfile = {
  id: "fx-user-1",
  email: "nguyen.van.an@example.vn",
  displayName: "Nguyễn Văn An",
  timezone: "Asia/Ho_Chi_Minh",
  sidebarCollapsed: false,
  connections: { database: "connected", ai: "configured" },
  createdAt: T0,
  updatedAt: T1,
};

export const studySets: StudySet[] = [
  {
    id: "fx-set-xs-1",
    subject: "Toán",
    title: "Xác suất thống kê",
    description: "Môn xác suất cho học sinh lớp 12, bao gồm không gian mẫu, biến cố, xác suất có điều kiện, độc lập, định lý Bayes và các phân phối thông dụng.",
    revision: 1,
    createdAt: T0,
    updatedAt: T0,
  },
  {
    id: "fx-set-giai-1",
    subject: "Toán",
    title: "Giải tích 1",
    description: "Đạo hàm, tích phân lớp 11: quy tắc chuỗi, đạo hàm hợp, tích phân từng phần và định lý cơ bản của giải tích.",
    revision: 1,
    createdAt: T0,
    updatedAt: T0,
  },
];

export const sources: Source[] = [
  {
    id: "fx-src-1",
    studySetId: "fx-set-xs-1",
    title: "Sách giáo khoa Toán 12 - Chương 5: Xác suất",
    content: `Chương 5. XÁC SUẤT THỐNG KÊ.

Định nghĩa 5.1. Không gian mẫu (ký hiệu Ω) là tập hợp tất cả các kết quả có thể xảy ra của một phép thử ngẫu nhiên. Mỗi phần tử ω ∈ Ω gọi là một kết quả mẫu hay một phép thử sơ cấp.

Ví dụ 5.1. Gieo một con xúc xắc đều sáu mặt. Không gian mẫu là Ω = {1, 2, 3, 4, 5, 6}. Số phần tử của Ω là |Ω| = 6.

Định nghĩa 5.2. Biến cố là tập con A ⊂ Ω. Biến cố A xảy ra khi kết quả của phép thử ω thuộc A, tức là ω ∈ A.

Xét phép thử: Chọn ngẫu nhiên một học sinh trong lớp 12A có 45 học sinh, trong đó 25 học sinh thích Toán (T), 20 học sinh thích Văn (V), và 10 học sinh thích cả hai môn.

Định nghĩa 5.3. Xác suất của biến cố A là P(A) = |A| / |Ω|, khi mọi kết quả mẫu đồng khả năng.

Theo quy tắc cộng: P(T ∪ V) = P(T) + P(V) - P(T ∩ V) = 25/45 + 20/45 - 10/45 = 35/45 = 7/9.

Định nghĩa 5.4. Xác suất có điều kiện của A biết B đã xảy ra (với P(B) > 0): P(A|B) = P(A ∩ B) / P(B).

Trong ví dụ trên, gọi C là biến cố "học sinh thích Toán" và D là biến cố "học sinh thích Văn". Ta có:
P(D|C) = P(D ∩ C) / P(C) = (10/45) / (25/45) = 10/25 = 0.4.
Định lý 5.1 (Định lý Bayes). Với các biến cố B₁, B₂, ..., Bₙ tạo thành một họ đầy đủ và đôi khi loại trừ lẫn nhau, ta có:
P(Bᵢ|A) = P(A|Bᵢ) · P(Bᵢ) / Σⱼ P(A|Bⱼ) · P(Bⱼ).`,
    revision: 1,
    createdAt: T0,
    updatedAt: T0,
  },
  {
    id: "fx-src-2",
    studySetId: "fx-set-xs-1",
    title: "Sách bài tập Toán 12 - Phần phân phối nhị thức",
    content: `Phân phối nhị thức. Xét một phép thử Bernoulli lặp lại n lần độc lập, trong mỗi lần biến cố A có xác suất xảy ra là p (0 < p < 1). Gọi X là số lần A xảy ra trong n phép thử. Khi đó X tuân theo phân phối nhị thức với tham số n và p, ký hiệu X ~ B(n, p).

Công thức xác suất: P(X = k) = C(n, k) · pᵏ · (1-p)ⁿ⁻ᵏ, với k = 0, 1, 2, ..., n.
Trong đó C(n, k) = n! / (k! · (n-k)!) là tổ hợp chập k của n phần tử.

Kỳ vọng (giá trị trung bình): E[X] = n · p.
Phương sai: Var(X) = n · p · (1-p).
Độ lệch chuẩn: σ = √Var(X) = √(n · p · (1-p)).

Ví dụ ứng dụng: Tỷ lệ học sinh đậu kỳ thi tốt nghiệp THPT năm 2025 là 0.85. Chọn ngẫu nhiên 10 học sinh. Tìm xác suất để:
a) Chính xác 8 học sinh đậu.
b) Ít nhất 7 học sinh đậu.

Giải a): X ~ B(10, 0.85). P(X=8) = C(10,8) · 0.85⁸ · 0.15² = 45 · 0.2725 · 0.0225 ≈ 0.2759.
Giải b): P(X ≥ 7) = P(X=7) + P(X=8) + P(X=9) + P(X=10). Tính từng số hạng rồi cộng lại ta được kết quả khoảng 0.9500 hay 95%.

Lưu ý: Khi n lớn (thường n ≥ 30 và np ≥ 5, n(1-p) ≥ 5), phân phối nhị thức có thể xấp xỉ bằng phân phối chuẩn theo định lý giới hạn trung tâm.`,
    revision: 1,
    createdAt: T0,
    updatedAt: T0,
  },
  {
    id: "fx-src-3",
    studySetId: "fx-set-giai-1",
    title: "Giải tích 11 - Chương 2 & 3: Đạo hàm và Tích phân",
    content: `Chương 2. ĐẠO HÀM.

Định nghĩa 2.1. Đạo hàm của hàm số y = f(x) tại điểm x₀ là giới hạn (nếu tồn tại):
f'(x₀) = lim_{Δx→0} [f(x₀ + Δx) - f(x₀)] / Δx.

Định lý 2.1 (Quy tắc chuỗi - Chain Rule). Cho hàm hợp y = f(g(x)). Đặt u = g(x) thì y = f(u). Nếu g khả vi tại x và f khả vi tại u = g(x) thì:
y' = f'(u) · g'(x) = f'(g(x)) · g'(x).

Ví dụ 2.1. Tính đạo hàm của y = sin(x²). Đặt u = x², y = sin(u).
Ta có: u' = 2x, y'_u = cos(u). Do đó y' = cos(x²) · 2x = 2x·cos(x²).

Chương 3. TÍCH PHÂN.

Định lý 3.1 (Tích phân từng phần). Cho hai hàm số u(x) và v(x) có đạo hàm liên tục trên đoạn [a, b]. Khi đó:
∫ u dv = u·v - ∫ v du.
Cách nhớ: "Nguyên hàm của u dv bằng uv trừ nguyên hàm của v du".

Ví dụ 3.1. Tính I = ∫ x·eˣ dx.
Chọn u = x, dv = eˣ dx. Suy ra du = dx, v = eˣ.
I = x·eˣ - ∫ eˣ dx = x·eˣ - eˣ + C = (x - 1)·eˣ + C.

Định lý 3.2 (Định lý cơ bản của giải tích - Newton-Leibniz). Nếu f liên tục trên [a, b] và F là một nguyên hàm của f trên đoạn đó thì:
∫ₐᵇ f(x) dx = F(b) - F(a).

Ví dụ 3.2. Tính ∫₀² (3x² + 2x) dx.
Nguyên hàm: F(x) = x³ + x².
Kết quả: F(2) - F(0) = (8 + 4) - 0 = 12.`,
    revision: 1,
    createdAt: T0,
    updatedAt: T0,
  },
];

function makeSourceRef(sourceId: string, excerpt: string): SourceRef {
  return { sourceId, revision: 1, excerpt };
}

export const concepts: Concept[] = [
  {
    id: "fx-concept-xs-sample-space",
    studySetId: "fx-set-xs-1",
    title: "Không gian mẫu",
    body: `Không gian mẫu (ký hiệu Ω) là tập hợp tất cả các kết quả có thể xảy ra của một phép thử ngẫu nhiên. Mỗi phần tử ω ∈ Ω gọi là một kết quả mẫu hay một phép thử sơ cấp.

Ví dụ gieo xúc xắc: Ω = {1,2,3,4,5,6}. Chọn học sinh từ lớp 12A có 45 em: Ω chính là tập 45 học sinh đó.

Một biến cố A là tập con A ⊂ Ω. A xảy ra ⇔ ω ∈ A. Xác suất theo định nghĩa cổ điển (đồng khả năng): P(A) = |A| / |Ω|. Để áp dụng, phải chắc chắn mọi kết quả mẫu có khả năng xảy ra như nhau.

Quy tắc cộng cho hai biến cố: P(A ∪ B) = P(A) + P(B) - P(A ∩ B). Trừ đi phần giao để không đếm hai lần.`,
    status: "approved",
    sourceRefs: [
      makeSourceRef("fx-src-1", "Không gian mẫu (ký hiệu Ω) là tập hợp tất cả các kết quả có thể xảy ra của một phép thử ngẫu nhiên."),
      makeSourceRef("fx-src-1", "Xác suất của biến cố A là P(A) = |A| / |Ω|, khi mọi kết quả mẫu đồng khả năng."),
    ],
    revision: 1,
    createdAt: T0,
    updatedAt: T0,
  },
  {
    id: "fx-concept-xs-conditional-prob",
    studySetId: "fx-set-xs-1",
    title: "Xác suất có điều kiện P(A|B)",
    body: `Xác suất có điều kiện P(A|B) đo lường khả năng biến cố A xảy ra khi biết chắc chắn B đã xảy ra. Công thức (với P(B) > 0):

  P(A|B) = P(A ∩ B) / P(B)

Ví dụ lớp 12A: 25 thích Toán (C), 20 thích Văn (D), 10 thích cả hai. Tính P(D|C):
  P(D ∩ C) = 10/45, P(C) = 25/45
  P(D|C) = (10/45) / (25/45) = 10/25 = 0.4 = 40%.

Như vậy, nếu đã biết học sinh thích Toán thì có 40% khả năng em ấy cũng thích Văn. Công thức nhân suy ra từ định nghĩa: P(A ∩ B) = P(B) · P(A|B) = P(A) · P(B|A).

Để diễn giải đúng: P(A|B) khác P(B|A). Đây là điểm học sinh lớp 12 thường nhầm lẫn.`,
    status: "approved",
    sourceRefs: [
      makeSourceRef("fx-src-1", "Xác suất có điều kiện của A biết B đã xảy ra (với P(B) > 0): P(A|B) = P(A ∩ B) / P(B)."),
    ],
    revision: 1,
    createdAt: T0,
    updatedAt: T0,
  },
  {
    id: "fx-concept-xs-independent",
    studySetId: "fx-set-xs-1",
    title: "Hai biến cố độc lập",
    body: `Hai biến cố A và B gọi là độc lập về mặt xác suất nếu xảy ra của biến cố này không làm ảnh hưởng (thay đổi) xác suất xảy ra của biến cố kia.

Định nghĩa chính thức: A, B độc lập ⇔ P(A ∩ B) = P(A) · P(B).
Dạng tương đương với xác suất có điều kiện (khi P(A), P(B) > 0):
  P(A|B) = P(A) và P(B|A) = P(B).

Ví dụ: Gieo hai đồng xu. A là "đồng xu 1 ra ngửa", B là "đồng xu 2 ra ngửa". P(A) = P(B) = 1/2. P(A ∩ B) = 1/4 = (1/2)(1/2). Vậy A, B độc lập.

Cảnh báo điển hình: Độc lập ≠ loại trừ lẫn nhau. Nếu A, B loại trừ (A∩B = ∅) và đều có xác suất dương thì chúng phụ thuộc, vì P(A∩B)=0 ≠ P(A)P(B) > 0.

Ba hay nhiều biến cố độc lập cần kiểm tra mọi tích cặp và tích bội, không chỉ từng cặp.`,
    status: "approved",
    sourceRefs: [
      makeSourceRef("fx-src-1", "Theo quy tắc cộng: P(T ∪ V) = P(T) + P(V) - P(T ∩ V)"),
    ],
    revision: 1,
    createdAt: T0,
    updatedAt: T0,
  },
  {
    id: "fx-concept-xs-bayes",
    studySetId: "fx-set-xs-1",
    title: "Định lý Bayes",
    body: `Định lý Bayes là công thức "đảo ngược" xác suất có điều kiện: từ P(A|B) tính P(B|A). Nó rất quan trọng trong thống kê suy diễn và học máy.

Phát biểu đầy đủ: Cho họ đầy đủ các biến cố đôi khi loại trừ B₁, ..., Bₙ (tức là ∪Bᵢ = Ω và Bᵢ ∩ Bⱼ = ∅ khi i ≠ j). Với mỗi i:

  P(Bᵢ|A) = P(A|Bᵢ) · P(Bᵢ) / Σⱼ₌₁ⁿ P(A|Bⱼ) · P(Bⱼ)

P(Bᵢ) gọi là xác suất tiên nghiệm (trước khi biết A). P(Bᵢ|A) là xác suất hậu nghiệm (sau khi quan sát A).

Ví dụ y tế: Tỷ lệ mắc bệnh D là 1% = P(D). Test dương tính khi thật mắc là 95% = P(+|D). Test dương tính giả trên người khỏe là 2% = P(+|¬D). Tính P(D|+):

  P(+) = P(+|D)P(D) + P(+|¬D)P(¬D) = 0.95·0.01 + 0.02·0.99 = 0.0095 + 0.0198 = 0.0293
  P(D|+) = 0.95·0.01 / 0.0293 ≈ 0.324 = 32.4%

Kết quả này ngạc nhiên: chỉ ~32% người dương tính thật sự mắc bệnh, do bệnh hiếm và dương tính giả tích lũy.`,
    status: "approved",
    sourceRefs: [
      makeSourceRef("fx-src-1", "Định lý 5.1 (Định lý Bayes). Với các biến cố B₁, B₂, ..., Bₙ tạo thành một họ đầy đủ và đôi khi loại trừ lẫn nhau."),
    ],
    revision: 1,
    createdAt: T0,
    updatedAt: T0,
  },
  {
    id: "fx-concept-xs-binomial",
    studySetId: "fx-set-xs-1",
    title: "Phân phối nhị thức",
    body: `Phân phối nhị thức B(n, p) mô tả số lần thành công X trong n phép thử Bernoulli độc lập, mỗi lần với xác suất thành công p.

Điều kiện áp dụng: (1) phép thử lặp lại n lần độc lập, (2) mỗi lần chỉ có 2 kết quả (thành công/thất bại), (3) xác suất thành công p không đổi qua các lần.

Công thức: P(X = k) = C(n,k) · pᵏ · (1-p)ⁿ⁻ᵏ, k = 0..n.
C(n,k) = n!/(k!(n-k)!) là số cách chọn k thành công trong n lần.

Các đặc trưng số:
  • Kỳ vọng (trung bình): E[X] = n·p
  • Phương sai: Var(X) = n·p·(1-p)
  • Độ lệch chuẩn: σ = √(n·p·(1-p))

Ví dụ: Tỷ lệ đậu tốt nghiệp THPT 2025 là 0.85. Chọn ngẫu nhiên 10 học sinh. X ~ B(10, 0.85).
E[X] = 8.5 (trung bình 8-9 em đậu).
P(X=8) = C(10,8) · 0.85⁸ · 0.15² = 45 · 0.2725 · 0.0225 ≈ 0.2759 (khoảng 27.6%).
P(X ≥ 7) ≈ 0.95 (95% có ít nhất 7 em đậu).

Khi n ≥ 30, np ≥ 5, n(1-p) ≥ 5, ta có thể xấp xỉ B(n,p) bằng N(np, np(1-p)).`,
    status: "pending",
    sourceRefs: [
      makeSourceRef("fx-src-2", "X tuân theo phân phối nhị thức với tham số n và p, ký hiệu X ~ B(n, p)."),
      makeSourceRef("fx-src-2", "Kỳ vọng (giá trị trung bình): E[X] = n · p."),
    ],
    revision: 1,
    createdAt: T0,
    updatedAt: T0,
  },
  {
    id: "fx-concept-giai-chain-rule",
    studySetId: "fx-set-giai-1",
    title: "Đạo hàm hợp (chain rule)",
    body: `Quy tắc chuỗi dùng để đạo hàm hàm hợp (hàm của hàm). Cho y = f(g(x)). Đặt u = g(x) thì y = f(u). Nếu g khả vi tại x và f khả vi tại u = g(x) thì:

  y' = f'(u) · g'(x) = f'(g(x)) · g'(x)

Cách đọc tự nhiên: "Đạo hàm ngoài × đạo hàm trong".

Ví dụ 1: y = sin(x²). u = x² (trong), y = sin(u) (ngoài).
y' = cos(u) · 2x = cos(x²) · 2x = 2x·cos(x²).

Ví dụ 2: y = (x³ + 2x - 1)⁵. u = x³ + 2x - 1, y = u⁵.
y' = 5u⁴ · (3x² + 2) = 5(x³ + 2x - 1)⁴ · (3x² + 2).

Ví dụ 3 (nhiều lớp - chain nhiều lần): y = e^{sin(√x)}.
y' = e^{sin(√x)} · cos(√x) · (1/(2√x)).

Một trong ba lỗi thường gặp: (1) quên nhân đạo hàm trong (hại nhất, hay quên), (2) đạo hàm ngoài sai dạng, (3) thay u sai bậc khi viết kết quả cuối. Luôn kiểm tra lại bước cuối cùng xem đã có đủ đạo hàm của mọi lớp chưa.`,
    status: "approved",
    sourceRefs: [
      makeSourceRef("fx-src-3", "Định lý 2.1 (Quy tắc chuỗi - Chain Rule). Cho hàm hợp y = f(g(x)). Đặt u = g(x) thì y = f(u)."),
    ],
    revision: 1,
    createdAt: T0,
    updatedAt: T0,
  },
  {
    id: "fx-concept-giai-integration-by-parts",
    studySetId: "fx-set-giai-1",
    title: "Tích phân từng phần",
    body: `Tích phân từng phần là công thức đảo ngược của quy tắc đạo hàm tích. Công thức:

  ∫ u dv = u·v - ∫ v du

Hoặc dạng xác định trên đoạn [a,b]:
  ∫ₐᵇ u dv = [u·v]ₐᵇ - ∫ₐᵇ v du

Chọn u và dv đúng là kỹ năng quan trọng. Quy tắc gợi nhớ ILATE (ưu tiên u):
  I = Inverse trig (arcsin, arctan...)
  L = Logarithmic (ln, log)
  A = Algebraic (x², x³...)
  T = Trigonometric (sin, cos...)
  E = Exponential (eˣ, aˣ)

Ví dụ 1: ∫ x·eˣ dx. Theo ILATE, u = x (A trước E), dv = eˣ dx.
du = dx, v = eˣ.
I = x·eˣ - ∫ eˣ dx = (x - 1)·eˣ + C.

Ví dụ 2: ∫ ln(x) dx. u = ln(x), dv = dx.
du = (1/x) dx, v = x.
I = x·ln(x) - ∫ x·(1/x) dx = x·ln(x) - x + C.

Ví dụ 3 (lặp, tạo phương trình): ∫ eˣ·sin(x) dx.
u = sin(x), dv = eˣ dx  →  I = eˣ·sin(x) - ∫ eˣ·cos(x) dx.
Lần hai cho ∫eˣ·cos(x): u=cos, dv=eˣ dx → được eˣ·cos(x) + ∫eˣ·sin(x)dx.
Thay vào: I = eˣ·sin(x) - [eˣ·cos(x) + I]. Giải phương trình: I = (eˣ/2)(sin x - cos x) + C.`,
    status: "pending",
    sourceRefs: [
      makeSourceRef("fx-src-3", "Định lý 3.1 (Tích phân từng phần). Cho hai hàm số u(x) và v(x) có đạo hàm liên tục trên đoạn [a, b]."),
    ],
    revision: 1,
    createdAt: T0,
    updatedAt: T0,
  },
  {
    id: "fx-concept-giai-fundamental-calc",
    studySetId: "fx-set-giai-1",
    title: "Định lý cơ bản giải tích",
    body: `Định lý cơ bản của giải tích (Newton-Leibniz) nối hai nhánh lớn: đạo hàm và tích phân, chỉ ra chúng là hai phép toán ngược nhau.

Phát biểu (dạng tính tích phân xác định): Nếu f liên tục trên [a, b] và F là một nguyên hàm của f (tức F'(x) = f(x) với mọi x ∈ [a, b]) thì:

  ∫ₐᵇ f(x) dx = F(b) - F(a)

Ký hiệu tắt: [F(x)]ₐᵇ = F(b) - F(a).

Ví dụ tính diện tích hình thang cong giới hạn bởi y = 3x² + 2x, trục hoành, x = 0 và x = 2:
  F(x) = x³ + x² (nguyên hàm)
  S = ∫₀² (3x² + 2x) dx = [x³ + x²]₀² = (8 + 4) - 0 = 12 (đvdt).

Dạng 2 của định lý (nguyên hàm biến đổi cận trên): Nếu f liên tục trên I và c ∈ I thì hàm
  F(x) = ∫cˣ f(t) dt
có đạo hàm F'(x) = f(x) với mọi x ∈ I. Nói cách khác, đạo hàm của tích phân biến cận bằng hàm dưới dấu tích phân tại cận trên.

Ví dụ F(x) = ∫₀ˣ sin(t²) dt → F'(x) = sin(x²). Nếu cận dưới là hàm u(x), cận trên là hàm v(x):
  d/dx ∫_{u(x)}^{v(x)} f(t) dt = f(v(x))·v'(x) - f(u(x))·u'(x).

Định lý này có ý nghĩa lịch sử lớn: trước Newton và Leibniz, người ta tính diện tích bằng các phương pháp hình học khéo léo, tốn nhiều công sức. Sau định lý này, chỉ cần tìm nguyên hàm là xong.`,
    status: "pending",
    sourceRefs: [
      makeSourceRef("fx-src-3", "Định lý 3.2 (Định lý cơ bản của giải tích - Newton-Leibniz). Nếu f liên tục trên [a, b] và F là một nguyên hàm của f."),
    ],
    revision: 1,
    createdAt: T0,
    updatedAt: T0,
  },
];

function conceptRef(id: string): ConceptRef {
  return { conceptId: id, revision: 1 };
}

function approvedConceptBody(id: string): Concept {
  const c = concepts.find((x) => x.id === id)!;
  return { ...c, status: "approved" };
}

const msgU1: Message = {
  id: "fx-msg-s1-u1",
  sessionId: "fx-session-1",
  role: "user",
  content: "Em không hiểu vì sao P(A|B) lại khác P(B|A). Giải thích giúp em với ví dụ lớp học ạ.",
  status: "completed",
  solve: null,
  requestId: "fx-req-s1-1",
  createdAt: T1,
  updatedAt: T1,
};

const msgA1: Message = {
  id: "fx-msg-s1-a1",
  sessionId: "fx-session-1",
  role: "assistant",
  content: "Đây là điểm dễ nhầm lẫn đấy. Để phân biệt rõ, em hãy nghĩ đến \"điều kiện ràng buộc\" nhé. Em có thể mô tả cho thầy/cô biết: nếu mình thu hẹp không gian mẫu chỉ vào những học sinh THÍCH TOÁN (điều kiện C), thì tỷ lệ thích Văn trong nhóm đó là bao nhiêu?",
  status: "completed",
  solve: null,
  requestId: "fx-req-s1-1",
  createdAt: T1,
  updatedAt: T1,
};

const msgA1b: Message = {
  id: "fx-msg-s1-a1b",
  sessionId: "fx-session-1",
  role: "assistant",
  content: "Đúng rồi! Vậy nếu ngược lại: giới hạn vào nhóm thích Văn (điều kiện D), thì tỷ lệ thích Toán trong nhóm đó bằng bao nhiêu?",
  status: "completed",
  solve: null,
  requestId: "fx-req-s1-2",
  createdAt: T1,
  updatedAt: T1,
};

const msgU2: Message = {
  id: "fx-msg-s2-u1",
  sessionId: "fx-session-2",
  role: "user",
  content: "Lớp 12A có 45 học sinh, 25 thích Toán, 20 thích Văn, 10 thích cả hai. Chọn ngẫu nhiên 1 học sinh. Biết học sinh đó thích Toán, tính xác suất em ấy cũng thích Văn.",
  status: "completed",
  solve: null,
  requestId: "fx-req-s2-1",
  createdAt: T1,
  updatedAt: T1,
};

const solveSteps: SolveResult["steps"] = [
  {
    number: 1,
    action: "Đặt ký hiệu các biến cố",
    explanation: "Gọi C là biến cố \"học sinh thích Toán\", D là biến cố \"học sinh thích Văn\". Theo đề bài ta có: |Ω| = 45, |C| = 25, |D| = 20, |C ∩ D| = 10.",
    principle: "Mô hình hóa bài toán xác suất vào các biến cố tương ứng.",
  },
  {
    number: 2,
    action: "Nhận dạng yêu cầu là xác suất có điều kiện",
    explanation: "Yêu cầu đề bài: \"Biết học sinh thích Toán, tính xác suất em ấy cũng thích Văn\" chính là P(D | C). Điều kiện ràng buộc là C (đã biết thích Toán).",
    principle: "Định nghĩa xác suất có điều kiện P(A|B) = P(A ∩ B) / P(B).",
  },
  {
    number: 3,
    action: "Tính P(C) và P(D ∩ C)",
    explanation: "P(C) = |C| / |Ω| = 25/45 = 5/9. P(D ∩ C) = |D ∩ C| / |Ω| = 10/45 = 2/9.",
    principle: "Định nghĩa cổ điển về xác suất với mẫu đồng khả năng.",
  },
  {
    number: 4,
    action: "Áp dụng công thức",
    explanation: "P(D|C) = P(D ∩ C) / P(C) = (10/45) / (25/45) = 10/25 = 2/5 = 0.4.",
    principle: "Công thức nhân của xác suất suy ra từ định nghĩa có điều kiện.",
  },
  {
    number: 5,
    action: "Trình bày kết quả cuối cùng",
    explanation: "Kết luận: Xác suất học sinh được chọn thích Văn, biết rằng em ấy thích Toán, bằng 2/5 hay 40%.",
    principle: "Kiểm tra đơn vị, diễn giải kết quả bằng lời tự nhiên.",
  },
];

const msgA2: Message = {
  id: "fx-msg-s2-a1",
  sessionId: "fx-session-2",
  role: "assistant",
  content: "Chào em, đây là bài giải chi tiết từng bước nhé:\n\n**Bước 1.** Đặt ký hiệu: C = \"thích Toán\", D = \"thích Văn\". |Ω| = 45, |C| = 25, |D| = 20, |C ∩ D| = 10.\n\n**Bước 2.** Đề hỏi: biết học sinh thích Toán → xác suất thích Văn = P(D | C).\n\n**Bước 3.** P(C) = 25/45, P(D ∩ C) = 10/45.\n\n**Bước 4.** P(D|C) = (10/45) ÷ (25/45) = 10/25 = 2/5 = 40%.\n\nVậy xác suất cần tìm là 40%.",
  status: "completed",
  solve: {
    steps: solveSteps,
    comprehensionCheck: "Nếu tăng số học sinh thích cả hai lên 8 thì P(Đ|C) đổi bao nhiêu?",
    sourceRefs: [makeSourceRef("fx-src-1", "Xác suất có điều kiện của A biết B đã xảy ra (với P(B) > 0): P(A|B) = P(A ∩ B) / P(B).")],
  },
  requestId: "fx-req-s2-1",
  createdAt: T1,
  updatedAt: T1,
};

const msgA2b: Message = {
  id: "fx-msg-s2-a2",
  sessionId: "fx-session-2",
  role: "assistant",
  content: "Để củng cố thêm, em thử giải lại: giả sử chỉ có 8 học sinh thích cả hai (giảm đi 2 em), thì P(D|C) bằng bao nhiêu? Hãy tính nhẩm rồi trả lời nhé.",
  status: "completed",
  solve: null,
  requestId: "fx-req-s2-2",
  createdAt: T1,
  updatedAt: T1,
};

const msgU3: Message = {
  id: "fx-msg-s3-u1",
  sessionId: "fx-session-3",
  role: "user",
  content: "Giải thích nhanh giúp em quy tắc chuỗi là gì và ví dụ đơn giản thôi ạ.",
  status: "completed",
  solve: null,
  requestId: "fx-req-s3-1",
  createdAt: T2,
  updatedAt: T2,
};

const msgA3: Message = {
  id: "fx-msg-s3-a1",
  sessionId: "fx-session-3",
  role: "assistant",
  content: "Quy tắc chuỗi = đạo hàm hàm hợp = \"đạo hàm ngoài × đạo hàm trong\".\n\nVí dụ y = sin(x²): ngoài là sin(u), trong là u = x².\n→ y' = cos(x²) · 2x = 2x·cos(x²).\n\nNhớ nhân đạo hàm trong, lỗi hay nhất là quên bước đó.",
  status: "completed",
  solve: null,
  requestId: "fx-req-s3-1",
  createdAt: T2,
  updatedAt: T2,
};

const msgA3b: Message = {
  id: "fx-msg-s3-a2",
  sessionId: "fx-session-3",
  role: "assistant",
  content: "Muốn luyện thêm thì làm ngay: y = (x³ + 1)⁴ đạo hàm ra sao? Gợi ý: ngoài u⁴, trong u = x³ + 1.",
  status: "completed",
  solve: null,
  requestId: "fx-req-s3-2",
  createdAt: T2,
  updatedAt: T2,
};

export const sessions: LearningSession[] = [
  {
    id: "fx-session-1",
    studySetId: "fx-set-xs-1",
    title: "Hỏi đáp về xác suất có điều kiện",
    mode: "socratic",
    status: "active",
    createdAt: T1,
    updatedAt: T1,
  },
  {
    id: "fx-session-2",
    studySetId: "fx-set-xs-1",
    title: "Giải bài tập P(A|B) lớp 12A",
    mode: "solve",
    status: "active",
    createdAt: T1,
    updatedAt: T1,
  },
  {
    id: "fx-session-3",
    studySetId: "fx-set-giai-1",
    title: "Quy tắc chuỗi (chain rule) giải tích",
    mode: "ask",
    status: "ended",
    createdAt: T2,
    updatedAt: T2,
  },
];

export const messages: Message[] = [msgU1, msgA1, msgA1b, msgU2, msgA2, msgA2b, msgU3, msgA3, msgA3b];

function makeFinding(text: string, quote: string | null, conceptId: string, excerpt: string, srcId: string): Finding {
  return {
    text,
    learnerQuote: quote
      ? { text: quote, start: 0, end: quote.length }
      : null,
    evidence: [
      {
        conceptId,
        revision: 1,
        excerpt,
        sourceRefs: [makeSourceRef(srcId, excerpt)],
      },
    ],
  };
}

const FEYNMAN_LEARNER = `Không gian mẫu Ω là tất cả kết quả của phép thử. Ví dụ gieo xúc xắc thì Ω = {1,2,3,4,5,6}. Biến cố A là tập con của Ω. Xác suất P(A) = |A| / |Ω| khi mọi thứ đồng khả năng. Quy tắc cộng: P(A ∪ B) = P(A) + P(B) - P(A ∩ B), trừ đi phần giao để không đếm hai lần. Xác suất có điều kiện P(A|B) = P(A ∩ B) / P(B), nó khác P(B|A), ví dụ trong lớp 12A thích Toán/Văn thì P(D|C) và P(C|D) cho kết quả khác nhau (40% so với 50%). Hai biến cố độc lập khi P(A ∩ B) = P(A)·P(B), không nên nhầm lẫn độc lập với loại trừ lẫn nhau vì nếu loại trừ mà xác suất dương thì chúng phụ thuộc.`;

export const practiceAttemptFeynman: PracticeAttempt = {
  id: "fx-attempt-fey-1",
  kind: "feynman",
  studySetId: "fx-set-xs-1",
  learnerText: FEYNMAN_LEARNER,
  referenceSnapshots: [
    conceptRef("fx-concept-xs-sample-space"),
    conceptRef("fx-concept-xs-conditional-prob"),
    conceptRef("fx-concept-xs-independent"),
  ],
  status: "evaluated",
  retryOfId: null,
  createdAt: T2,
  updatedAt: T2,
};

const feynmanObservations: Finding[] = [
  makeFinding(
    "Học sinh trình bày chính xác định nghĩa không gian mẫu và ví dụ gieo xúc xắc.",
    "Không gian mẫu Ω là tất cả kết quả của phép thử. Ví dụ gieo xúc xắc thì Ω = {1,2,3,4,5,6}.",
    "fx-concept-xs-sample-space",
    "Không gian mẫu (ký hiệu Ω) là tập hợp tất cả các kết quả có thể xảy ra của một phép thử ngẫu nhiên.",
    "fx-src-1",
  ),
  makeFinding(
    "Nhấn mạnh sự khác biệt giữa P(A|B) và P(B|A) với số liệu cụ thể 40% so với 50%.",
    "ví dụ trong lớp 12A thích Toán/Văn thì P(D|C) và P(C|D) cho kết quả khác nhau (40% so với 50%).",
    "fx-concept-xs-conditional-prob",
    "Xác suất có điều kiện của A biết B đã xảy ra (với P(B) > 0): P(A|B) = P(A ∩ B) / P(B).",
    "fx-src-1",
  ),
  makeFinding(
    "Cảnh báo đúng rằng độc lập không tương đương loại trừ lẫn nhau.",
    "không nên nhầm lẫn độc lập với loại trừ lẫn nhau vì nếu loại trừ mà xác suất dương thì chúng phụ thuộc.",
    "fx-concept-xs-independent",
    "Cảnh báo điển hình: Độc lập ≠ loại trừ lẫn nhau.",
    "fx-src-1",
  ),
];

const feynmanResult: FeynmanResult = {
  kind: "feynman",
  sufficientEvidence: true,
  summary: "Em trình bày khá rõ các khái niệm cơ bản: không gian mẫu, xác suất có điều kiện và độc lập. Điểm tốt là có ví dụ cụ thể và cảnh báo lỗi thường gặp. Có thể bổ sung thêm 1-2 ví dụ tính toán chi tiết để chứng tỏ vận dụng thành thạo.",
  observations: feynmanObservations,
  scores: { clarity: 6, completeness: 5, accuracy: 4 },
};

export const practiceEvaluationFeynman: PracticeEvaluation = {
  id: "fx-eval-fey-1",
  attemptId: "fx-attempt-fey-1",
  result: feynmanResult,
  promptVersion: "review-spec-v1",
  model: "gpt-demo-mock",
  createdAt: T2,
};

const BLURTING_LEARNER = `Quy tắc chuỗi là đạo hàm ngoài nhân đạo hàm trong. Ví dụ y = sin(x²) thì y' = cos(x²) nhân 2x = 2x cos(x²). Quy tắc tích phân từng phần: ∫ u dv = uv - ∫ v du, nhớ ILATE để chọn u. Định lý Newton-Leibniz nói tích phân xác định bằng F(b) - F(a). Phân phối nhị thức dùng khi có n phép thử độc lập mỗi lần thành công p, kỳ vọng là np. Công thức xác suất P(X=k) = C(n,k) p^k (1-p)^(n-k). Định lý Bayes để đảo ngược điều kiện.`;

export const practiceAttemptBlurting: PracticeAttempt = {
  id: "fx-attempt-blurt-1",
  kind: "blurting",
  studySetId: "fx-set-giai-1",
  learnerText: BLURTING_LEARNER,
  referenceSnapshots: [
    conceptRef("fx-concept-giai-chain-rule"),
    conceptRef("fx-concept-giai-integration-by-parts"),
    conceptRef("fx-concept-giai-fundamental-calc"),
  ],
  status: "evaluated",
  retryOfId: null,
  createdAt: T2,
  updatedAt: T2,
};

const correctFindings: Finding[] = [
  makeFinding(
    "Viết đúng công thức quy tắc chuỗi kèm ví dụ chuẩn.",
    "Quy tắc chuỗi là đạo hàm ngoài nhân đạo hàm trong. Ví dụ y = sin(x²) thì y' = cos(x²) nhân 2x = 2x cos(x²).",
    "fx-concept-giai-chain-rule",
    "y' = f'(u) · g'(x) = f'(g(x)) · g'(x). Ví dụ y = sin(x²) → y' = 2x·cos(x²).",
    "fx-src-3",
  ),
  makeFinding(
    "Ghi nhớ đúng công thức tích phân từng phần và phương pháp ILATE.",
    "Quy tắc tích phân từng phần: ∫ u dv = uv - ∫ v du, nhớ ILATE để chọn u.",
    "fx-concept-giai-integration-by-parts",
    "∫ u dv = u·v - ∫ v du. Quy tắc gợi nhớ ILATE (ưu tiên u).",
    "fx-src-3",
  ),
  makeFinding(
    "Phát biểu đúng định lý Newton-Leibniz về tích phân xác định.",
    "Định lý Newton-Leibniz nói tích phân xác định bằng F(b) - F(a).",
    "fx-concept-giai-fundamental-calc",
    "∫ₐᵇ f(x) dx = F(b) - F(a).",
    "fx-src-3",
  ),
];

const missingFindings: Finding[] = [
  makeFinding(
    "Thiếu nêu lỗi thường gặp nhất: quên nhân đạo hàm trong khi áp dụng quy tắc chuỗi.",
    null,
    "fx-concept-giai-chain-rule",
    "Một trong ba lỗi thường gặp: (1) quên nhân đạo hàm trong (hại nhất, hay quên).",
    "fx-src-3",
  ),
  makeFinding(
    "Thiếu nêu dạng 2 của định lý cơ bản (đạo hàm tích phân biến cận).",
    null,
    "fx-concept-giai-fundamental-calc",
    "Dạng 2 của định lý (nguyên hàm biến đổi cận trên): F(x) = ∫cˣ f(t) dt → F'(x) = f(x).",
    "fx-src-3",
  ),
];

const incorrectFindings: Finding[] = [
  makeFinding(
    "Sai phạm vi: phân phối nhị thức thuộc học phần xác suất thống kê (study set XS), không phải giải tích. Học sinh đang lẫn lộn giữa các chủ đề.",
    "Phân phối nhị thức dùng khi có n phép thử độc lập mỗi lần thành công p, kỳ vọng là np.",
    "fx-concept-xs-binomial",
    "Phân phối nhị thức B(n, p) mô tả số lần thành công X trong n phép thử Bernoulli độc lập.",
    "fx-src-2",
  ),
];

const blurtingResult: BlurtingResult = {
  kind: "blurting",
  sufficientEvidence: true,
  summary: "Em nhớ khá tốt 3 định lý giải tích cốt lõi và có ví dụ minh họa cho quy tắc chuỗi. Tuy nhiên còn lẫn lộn giữa các học phần (đưa phân phối nhị thức vào giải tích) và thiếu một số ý quan trọng (lỗi thường gặp, dạng 2 định lý cơ bản). Cần ôn lại để hệ thống hóa chặt chẽ hơn.",
  observations: [...correctFindings, ...missingFindings, ...incorrectFindings],
  correct: correctFindings,
  missing: missingFindings,
  incorrect: incorrectFindings,
};

export const practiceEvaluationBlurting: PracticeEvaluation = {
  id: "fx-eval-blurt-1",
  attemptId: "fx-attempt-blurt-1",
  result: blurtingResult,
  promptVersion: "review-spec-v1",
  model: "gpt-demo-mock",
  createdAt: T2,
};

export const practiceAttempts: PracticeAttempt[] = [practiceAttemptFeynman, practiceAttemptBlurting];
export const practiceEvaluations: PracticeEvaluation[] = [practiceEvaluationFeynman, practiceEvaluationBlurting];
export const practiceDetails: PracticeDetail[] = [
  { attempt: practiceAttemptFeynman, evaluation: practiceEvaluationFeynman },
  { attempt: practiceAttemptBlurting, evaluation: practiceEvaluationBlurting },
];

function makeCard(i: number, conceptId: string, studySetId: string, front: string, back: string, dueOffsetDays: number, reps: number, lapses: number, state: 0 | 1 | 2 | 3): Flashcard {
  const due = new Date(T_NEAR);
  due.setUTCDate(due.getUTCDate() + dueOffsetDays);
  const lastReview = new Date(T_NEAR);
  lastReview.setUTCDate(lastReview.getUTCDate() - 3);
  const stability = 1.0 + reps * 3.5;
  const difficulty = 4 + (i % 5);
  return {
    id: `fx-card-${String(i).padStart(2, "0")}`,
    conceptId,
    studySetId,
    front,
    back,
    sourceRefs: [makeSourceRef(
      conceptId.startsWith("fx-concept-xs") ? "fx-src-1" : "fx-src-3",
      "Trích dẫn nội dung khái niệm tương ứng từ sách giáo khoa.",
    )],
    revision: 1,
    scheduler: {
      due: due.toISOString(),
      stability,
      difficulty,
      elapsed_days: Math.max(0, reps - 1),
      scheduled_days: reps * 2 + 1,
      learning_steps: reps >= 2 ? 0 : 1,
      reps,
      lapses,
      state,
      last_review: reps >= 1 ? lastReview.toISOString() : null,
    },
    createdAt: T0,
    updatedAt: T1,
  };
}

export const flashcards: Flashcard[] = [
  makeCard(1, "fx-concept-xs-sample-space", "fx-set-xs-1",
    "Định nghĩa không gian mẫu Ω và cho ví dụ gieo xúc xắc.",
    "Ω là tập tất cả kết quả có thể xảy ra. Ví dụ gieo xúc xắc: Ω = {1,2,3,4,5,6}. |Ω| = 6.",
    0, 5, 0, 2),
  makeCard(2, "fx-concept-xs-sample-space", "fx-set-xs-1",
    "Định nghĩa cổ điển P(A) là gì? Điều kiện áp dụng?",
    "P(A) = |A| / |Ω|. Áp dụng khi mọi kết quả mẫu đồng khả năng.",
    1, 4, 0, 2),
  makeCard(3, "fx-concept-xs-conditional-prob", "fx-set-xs-1",
    "Viết công thức P(A|B) và giải thích ý nghĩa.",
    "P(A|B) = P(A∩B) / P(B), với P(B) > 0. Là xác suất xảy ra A khi biết chắc chắn B đã xảy ra.",
    0, 3, 1, 2),
  makeCard(4, "fx-concept-xs-conditional-prob", "fx-set-xs-1",
    "Phân biệt P(A|B) và P(B|A) với ví dụ lớp 12A (45 hs, 25 T, 20 V, 10 cả hai).",
    "P(D|C) = 10/25 = 40%; P(C|D) = 10/20 = 50%. Hai giá trị này khác nhau.",
    -1, 5, 0, 3),
  makeCard(5, "fx-concept-xs-independent", "fx-set-xs-1",
    "Định nghĩa hai biến cố độc lập theo tích xác suất.",
    "A, B độc lập ⇔ P(A ∩ B) = P(A) · P(B).",
    1, 2, 0, 1),
  makeCard(6, "fx-concept-xs-independent", "fx-set-xs-1",
    "Độc lập và loại trừ lẫn nhau có giống nhau không? Giải thích.",
    "Không. Nếu A,B loại trừ mà P(A),P(B) > 0 thì P(A∩B)=0 ≠ P(A)P(B) > 0 → phụ thuộc.",
    2, 3, 0, 2),
  makeCard(7, "fx-concept-xs-bayes", "fx-set-xs-1",
    "Nêu công thức Định lý Bayes trong trường hợp hai biến cố B và ¬B.",
    "P(B|A) = P(A|B)·P(B) / [P(A|B)·P(B) + P(A|¬B)·P(¬B)].",
    0, 1, 1, 1),
  makeCard(8, "fx-concept-xs-bayes", "fx-set-xs-1",
    "Tại sao P(D|+) thường thấp trong test y tế khi bệnh hiếm?",
    "Do dương tính giả trên người khỏe tích lũy nhiều hơn trường hợp thật dương tính. Tiên nghiệm bệnh thấp kéo hậu nghiệm xuống.",
    3, 2, 0, 2),
  makeCard(9, "fx-concept-giai-chain-rule", "fx-set-giai-1",
    "Phát biểu quy tắc chuỗi cho hàm hợp y = f(g(x)).",
    "y' = f'(g(x)) · g'(x). Hay nói cách khác: đạo hàm ngoài × đạo hàm trong.",
    0, 5, 0, 2),
  makeCard(10, "fx-concept-giai-chain-rule", "fx-set-giai-1",
    "Tính đạo hàm của y = (x³ + 2x - 1)⁵.",
    "y' = 5(x³ + 2x - 1)⁴ · (3x² + 2). Lỗi hay gặp: quên nhân (3x² + 2).",
    1, 4, 0, 3),
];

function makeReviewEvent(idx: number, cardId: string, rating: "again" | "hard" | "good" | "easy", revBefore: number, revAfter: number, hoursAgo: number): ReviewEvent {
  const dt = new Date(T_NEAR);
  dt.setUTCHours(dt.getUTCHours() - hoursAgo);
  return {
    id: `fx-review-${String(idx).padStart(2, "0")}`,
    cardId,
    presentationId: `fx-pres-${String(idx).padStart(2, "0")}`,
    rating,
    reviewedAt: dt.toISOString(),
    revisionBefore: revBefore,
    revisionAfter: revAfter,
  };
}

export const reviewEvents: ReviewEvent[] = [
  makeReviewEvent(1, "fx-card-01", "good", 1, 2, 72),
  makeReviewEvent(2, "fx-card-01", "easy", 2, 3, 48),
  makeReviewEvent(3, "fx-card-02", "good", 1, 2, 70),
  makeReviewEvent(4, "fx-card-02", "hard", 2, 3, 46),
  makeReviewEvent(5, "fx-card-03", "again", 1, 2, 68),
  makeReviewEvent(6, "fx-card-03", "again", 2, 3, 60),
  makeReviewEvent(7, "fx-card-03", "hard", 3, 4, 44),
  makeReviewEvent(8, "fx-card-04", "easy", 1, 2, 66),
  makeReviewEvent(9, "fx-card-04", "easy", 2, 3, 42),
  makeReviewEvent(10, "fx-card-09", "good", 1, 2, 64),
  makeReviewEvent(11, "fx-card-10", "again", 1, 2, 62),
  makeReviewEvent(12, "fx-card-10", "good", 2, 3, 40),
];

function lastNEvents(cardId: string, n: number): ReviewEvent[] {
  return reviewEvents
    .filter((e) => e.cardId === cardId)
    .sort((a, b) => a.reviewedAt.localeCompare(b.reviewedAt))
    .slice(-n);
}

function topicStatusForSet(studySetId: string): "weak" | "growing" | "solid" | "nodata" {
  return topicStatus(flashcards.filter(c => c.studySetId === studySetId).map(c => cardStatus(lastNEvents(c.id, 5).reverse().map(e => e.rating))));
}
function assessmentObs(attempt: PracticeAttempt, ev: PracticeEvaluation): TopicProgress["assessmentObservations"][number] {
  return {
    attemptId: attempt.id,
    kind: attempt.kind,
    summary: ev.result.summary,
    sufficientEvidence: ev.result.sufficientEvidence,
    createdAt: ev.createdAt,
  };
}

export const topicProgress: TopicProgress[] = studySets.map((ss): TopicProgress => {
  const cardsInSet = flashcards.filter((c) => c.studySetId === ss.id);
  const eventsInSet = reviewEvents.filter((e) => cardsInSet.some((c) => c.id === e.cardId));
  const attemptsInSet = practiceAttempts.filter((a) => a.studySetId === ss.id);
  const assessments: TopicProgress["assessmentObservations"] = attemptsInSet
    .map((a) => {
      const ev = practiceEvaluations.find((e) => e.attemptId === a.id);
      return ev ? assessmentObs(a, ev) : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  return {
    studySetId: ss.id,
    title: ss.title,
    status: topicStatusForSet(ss.id),
    policyVersion: "reviews-v1",
    eligibleCardCount: cardsInSet.length,
    totalCardCount: cardsInSet.length,
    reviewCount: eventsInSet.length,
    latestAssessmentAt: assessments.length ? assessments[assessments.length - 1].createdAt : null,
    reviewEvidence: eventsInSet,
    assessmentObservations: assessments,
  };
});

export const reviewPresentations: ReviewPresentation[] = flashcards
  .filter((c) => new Date(c.scheduler.due).getTime() <= new Date(T_NEAR).getTime() + 2 * 86400_000)
  .map((c) => ({
    card: c,
    presentationId: `fx-pres-due-${c.id}`,
    expectedRevision: c.revision,
    dueAt: c.scheduler.due,
  }));

export const searchResult: SearchResult = {
  sessions: sessions.filter((s) => s.title.includes("xác suất") || s.title.includes("chuỗi")),
  concepts: concepts.filter((c) => c.title.includes("xác suất") || c.title.includes("hợp") || c.title.includes("Bayes")),
};

export const extractionResult: ExtractionResult = {
  concepts: [
    approvedConceptBody("fx-concept-xs-sample-space"),
    approvedConceptBody("fx-concept-xs-conditional-prob"),
    approvedConceptBody("fx-concept-xs-independent"),
    approvedConceptBody("fx-concept-xs-bayes"),
  ],
  duplicateWarnings: [
    {
      title: "Không gian mẫu và biến cố",
      existingConceptId: "fx-concept-xs-sample-space",
    },
  ],
};

export type Fixtures = {
  userProfile: UserProfile;
  studySets: StudySet[];
  sources: Source[];
  concepts: Concept[];
  sessions: LearningSession[];
  messages: Message[];
  practiceAttempts: PracticeAttempt[];
  practiceEvaluations: PracticeEvaluation[];
  practiceDetails: PracticeDetail[];
  flashcards: Flashcard[];
  reviewEvents: ReviewEvent[];
  topicProgress: TopicProgress[];
  reviewPresentations: ReviewPresentation[];
  searchResult: SearchResult;
  extractionResult: ExtractionResult;
};

export const fixtures: Fixtures = {
  userProfile,
  studySets,
  sources,
  concepts,
  sessions,
  messages,
  practiceAttempts,
  practiceEvaluations,
  practiceDetails,
  flashcards,
  reviewEvents,
  topicProgress,
  reviewPresentations,
  searchResult,
  extractionResult,
};
