# AGENTS.md — پروژه «شجره»

## 1. مأموریت پروژه

تو یک Senior Full-Stack Engineer، Product Designer و Software Architect هستی.

وظیفه تو ساخت یک وب‌اپلیکیشن حرفه‌ای، سریع، Mobile-First و فارسی برای ثبت، مدیریت، مشاهده و توسعه شجره‌نامه‌های خانوادگی است.

نام موقت محصول:

**شجره**

هدف:

کاربر بتواند خانواده و شجره‌نامه خود را به‌صورت ساختاریافته ثبت کند، افراد خانواده را به یکدیگر متصل کند، عکس و اسناد اضافه کند، روابط خانوادگی را مشاهده کند و در صورت تمایل با استفاده از AI، اطلاعات متنی درباره خانواده را به ساختار شجره‌نامه تبدیل کند.

محصول باید از ابتدا با معماری مناسب Cloudflare طراحی شود.

این پروژه نباید یک CRUD ساده با یک نمودار درختی باشد.

هدف ساخت یک محصول واقعی و قابل توسعه است.

---

# 2. اصول غیرقابل مذاکره

## مهم‌ترین اصل

**Mobile First**

اول برای صفحه موبایل طراحی کن.

بعد:

* Tablet
* Desktop

را توسعه بده.

طراحی Desktop نباید نسخه کوچک‌شده Mobile باشد.

Mobile باید بهترین تجربه محصول باشد.

---

# 3. زبان و Direction

کل UI فقط فارسی است.

* زبان اصلی: فارسی
* Direction: RTL
* تمام متن‌های UI فارسی
* تمام پیام‌های validation فارسی
* تمام empty stateها فارسی
* تمام error messageها فارسی
* تمام tooltipها فارسی
* تمام dialogها فارسی

از متن انگلیسی در UI استفاده نکن مگر برای موارد فنی که واقعاً ضروری هستند.

کد و نام متغیرها می‌تواند انگلیسی باشد.

---

# 4. طراحی بصری

ظاهر پروژه باید:

* مدرن
* حرفه‌ای
* خانوادگی
* آرام
* قابل اعتماد
* premium
* مینیمال
* خوانا

باشد.

از طراحی‌های کلیشه‌ای dashboard استفاده نکن.

از این موارد اجتناب کن:

* کارت‌های بیش از حد
* gradientهای شدید
* neon
* UI شلوغ
* سایه‌های سنگین
* رنگ‌های کودکانه
* نمودارهای غیرقابل استفاده در موبایل

طراحی باید حس یک محصول واقعی و mature داشته باشد.

---

# 5. Theme

دو Theme کامل:

* Light
* Dark

Theme باید از ابتدا با design token ساخته شود.

از رنگ‌های hard-coded در componentها استفاده نکن.

مثلاً:

```text
--background
--foreground
--surface
--surface-muted
--border
--primary
--primary-foreground
--accent
--danger
--success
--warning
```

Dark mode نباید صرفاً background را سیاه کند.

کنتراست، hierarchy و خوانایی باید حفظ شود.

---

# 6. Responsive Design

Breakpoints را بر اساس محتوا انتخاب کن، نه صرفاً دستگاه.

حداقل:

```text
Mobile
Tablet
Desktop
Large Desktop
```

ویژگی‌های اصلی باید روی صفحه‌ای در حدود 360px نیز usable باشند.

هیچ جدول، نمودار یا فرم اصلی نباید در موبایل overflow خراب ایجاد کند.

---

# 7. معماری پیشنهادی

Architecture باید Cloudflare-friendly باشد.

ترجیح:

```text
Frontend
    ↓
React / TypeScript
    ↓
Cloudflare Workers
    ↓
D1
    ↓
R2
    ↓
Workers AI
```

از Cloudflare services به شکل native استفاده کن.

ترجیح معماری:

* Cloudflare Workers
* Cloudflare D1
* Cloudflare R2
* Workers AI

در صورت نیاز:

* Durable Objects
* Queues

از server وابسته به Node.js که برای Cloudflare Workers مناسب نیست استفاده نکن.

---

# 8. Database

Database باید relational و normalized باشد.

از ابتدا database را طوری طراحی کن که بعدها بتواند بزرگ شود.

Entities اصلی:

## users

```text
id
name
email / phone
password_hash یا auth_provider
avatar
role
created_at
updated_at
```

## families

```text
id
name
description
created_by
created_at
updated_at
```

## family_memberships

```text
id
family_id
user_id
role
status
created_at
```

## persons

```text
id
family_id
first_name
last_name
gender
birth_date
birth_place
death_date
death_place
biography
is_living
privacy_level
created_by
created_at
updated_at
```

## relationships

Relationship نباید فقط parent/child باشد.

حداقل:

```text
PARENT
CHILD
SPOUSE
PARTNER
```

ساختار:

```text
id
family_id
person_a_id
person_b_id
relationship_type
start_date
end_date
notes
created_at
```

اما برای parent-child بهتر است semantic direction مشخص باشد.

---

# 9. Family Graph

هسته اصلی سیستم باید Graph-like باشد.

Database relational است اما application layer باید بتواند genealogy graph بسازد.

مثلاً:

```text
Grandfather
   │
   ├── Son
   │     ├── Child
   │     └── Child
   │
   └── Daughter
         └── Child
```

هر Person یک node است.

Relationshipها edge هستند.

نباید tree فقط از JSON ذخیره‌شده در یک ستون ساخته شود.

---

# 10. اطلاعات فرد

هر Person باید بتواند اطلاعات زیر را داشته باشد:

### اطلاعات پایه

* نام
* نام خانوادگی
* نام پدر
* نام مادر
* جنسیت
* تاریخ تولد
* محل تولد
* تاریخ وفات
* محل وفات

### خانواده

* والدین
* همسر/همسران
* فرزندان
* خواهر و برادر

### اطلاعات تکمیلی

* شغل
* محل زندگی
* تحصیلات
* بیوگرافی
* خاطرات
* یادداشت‌ها

### Media

* عکس پروفایل
* عکس‌های خانوادگی
* اسناد
* فایل‌ها

---

# 11. اطلاعات تاریخی

سیستم فقط برای افراد زنده نیست.

باید بتوان اطلاعات تاریخی و ناقص را نیز ثبت کرد.

مثلاً:

```text
حدود سال ۱۲۵۰
```

یا:

```text
بین ۱۲۴۰ و ۱۲۵۵
```

یا:

```text
قبل از ازدواج
```

طراحی data model نباید فقط به YYYY-MM-DD محدود شود.

---

# 12. Privacy

Privacy یکی از مهم‌ترین قسمت‌های سیستم است.

حداقل:

```text
PUBLIC
FAMILY
PRIVATE
```

اطلاعات افراد زنده باید به‌صورت پیش‌فرض خصوصی‌تر از افراد تاریخی باشد.

کاربر نباید بتواند اطلاعات private فرد دیگری را فقط به دلیل عضویت در سایت مشاهده کند.

Authorization باید در backend اعمال شود.

فقط مخفی کردن UI کافی نیست.

---

# 13. Roles

حداقل:

```text
ADMIN
USER
```

ADMIN:

* مدیریت کاربران
* مشاهده خانواده‌ها
* مدیریت دسترسی
* مدیریت محتوا
* مدیریت گزارش‌ها
* تنظیمات AI
* مدیریت سیستم

USER:

* ساخت شجره
* ویرایش اطلاعات مجاز
* اضافه کردن افراد
* اضافه کردن روابط
* اضافه کردن عکس
* استفاده از AI
* مشاهده شجره‌هایی که اجازه دارد

معماری را طوری طراحی کن که بعداً roleهای بیشتری بتوان اضافه کرد.

---

# 14. اتصال خانواده‌ها

یکی از قابلیت‌های مهم محصول:

دو کاربر مختلف ممکن است درباره یک شخص یا خانواده مشترک اطلاعات داشته باشند.

مثلاً:

```text
Family A
   ↓
محمد قادری
   ↓
پدر: احمد
```

و کاربر دیگری:

```text
Family B
   ↓
احمد قادری
   ↓
فرزند: محمد
```

سیستم نباید به‌صورت خودکار دو شخص را یکی کند.

باید مفهوم:

```text
Possible Match
```

وجود داشته باشد.

AI یا سیستم می‌تواند پیشنهاد دهد:

> احتمال دارد این دو شخص یک نفر باشند.

اما:

**ادغام نهایی همیشه نیازمند تأیید کاربر/ادمین است.**

---

# 15. Search

Search باید یکی از قابلیت‌های اصلی باشد.

امکان جست‌وجو:

* نام
* نام خانوادگی
* محل
* تاریخ
* خانواده
* شغل
* متن biography
* notes

Search باید Persian-aware باشد.

حداقل مشکلات:

```text
ی / ي
ک / ك
فاصله
نیم‌فاصله
```

را normalize کن.

---

# 16. Family Tree UI

Tree View باید interactive باشد.

حداقل viewها:

### Ancestors

اجداد فرد.

### Descendants

فرزندان و نسل‌های بعد.

### Family

فرد + والدین + همسر + فرزندان.

### Relationship

مسیر رابطه دو فرد.

مثلاً:

```text
شما
 ↓
پدر
 ↓
پدربزرگ
 ↓
برادر پدربزرگ
 ↓
فرزند او
```

سیستم باید بتواند رابطه را توضیح دهد.

مثلاً:

> علی، پسرعموی پدر شماست.

---

# 17. Mobile Tree

این قسمت بسیار مهم است.

Tree chartهای دسکتاپ را نباید مستقیماً روی موبایل scale down کرد.

برای موبایل یک تجربه اختصاصی بساز.

مثلاً:

```text
┌───────────────────┐
│       پدربزرگ     │
│       احمد قادری  │
└─────────┬─────────┘
          │
     ┌────┴────┐
     │         │
   محمد       علی
     │
   ┌─┴─┐
  ... ...
```

امکان:

* zoom
* pan
* focus
* collapse
* expand
* انتخاب فرد

باید وجود داشته باشد.

در موبایل bottom sheet یا detail panel بسیار مناسب است.

---

# 18. Person Profile

صفحه هر شخص باید مثل یک mini biography باشد.

مثلاً:

```text
[عکس]

احمد قادری
۱۲۸۰ — ۱۳۵۵

پدر: ...
مادر: ...

[ والدین ]
[ همسر ]
[ فرزندان ]

────────────────

زندگی‌نامه

────────────────

عکس‌ها

────────────────

اسناد

────────────────

روابط

────────────────

تاریخچه تغییرات
```

---

# 19. Dashboard

Dashboard کاربر باید ساده و useful باشد.

مثلاً:

```text
سلام رمضان 👋

خانواده من

[ ۱۲۴ نفر ]
[ ۷ نسل ]
[ ۳۲ عکس ]
[ ۱۸ رویداد ]

آخرین تغییرات

...

[ مشاهده شجره ]

[ افزودن فرد ]

[ ساخت با هوش مصنوعی ]
```

از dashboardهای شلوغ خودداری کن.

---

# 20. AI

AI بخش مهم محصول است.

AI باید بتواند متن طبیعی را به ساختار genealogy تبدیل کند.

مثال:

کاربر:

```text
پدربزرگ من احمد قادری بود.
حدود سال 1300 در پاوه به دنیا آمد.
همسرش خدیجه بود.
آنها چهار فرزند داشتند:
محمد، علی، حسن و مریم.
محمد با فاطمه ازدواج کرد.
```

AI باید چیزی شبیه این تولید کند:

```json
{
  "persons": [
    {
      "temp_id": "p1",
      "name": "احمد قادری",
      "birth_year": 1300,
      "birth_place": "پاوه"
    }
  ],
  "relationships": [
    {
      "type": "SPOUSE",
      "from": "p1",
      "to": "p2"
    }
  ]
}
```

اما این JSON فقط یک internal representation است.

---

# 21. AI Confirmation Flow

AI نباید مستقیماً database را تغییر دهد.

Flow:

```text
User Text
   ↓
AI
   ↓
Structured Proposal
   ↓
Validation
   ↓
Human Review
   ↓
User confirms
   ↓
Database transaction
```

UI باید چیزی مثل این نمایش دهد:

> اطلاعاتی که از متن شما استخراج شد:

```text
احمد قادری
├── تولد: حدود ۱۳۰۰
├── محل تولد: پاوه
└── همسر: خدیجه
```

و سپس:

```text
[ تأیید و ثبت ]
[ ویرایش ]
[ لغو ]
```

---

# 22. AI نباید hallucinate کند

AI نباید اطلاعاتی را که در متن وجود ندارد بسازد.

مثلاً اگر کاربر گفت:

```text
احمد سه فرزند داشت.
```

AI نباید خودش نام سه فرزند را تولید کند.

برای اطلاعات نامشخص:

```text
unknown
```

یا:

```text
uncertain
```

استفاده شود.

هر اطلاعات استخراج‌شده باید provenance داشته باشد.

مثلاً:

```text
source = AI
confidence = 0.82
source_text = ...
```

---

# 23. AI Architecture

AI را abstract کن.

مثلاً:

```ts
interface GenealogyAIProvider {
  parseGenealogyText(input: string): Promise<GenealogyProposal>
  explainRelationship(...): Promise<string>
  suggestMatches(...): Promise<MatchSuggestion[]>
}
```

در production می‌توان از:

```text
Cloudflare Workers AI
```

استفاده کرد.

اما application نباید مستقیماً به یک مدل خاص وابسته شود.

---

# 24. Structured AI Output

از JSON Schema استفاده کن.

AI output باید validate شود.

هیچ JSON خامی از مدل نباید مستقیماً وارد database شود.

Pipeline:

```text
AI
 ↓
JSON
 ↓
Schema Validation
 ↓
Business Validation
 ↓
Human Confirmation
 ↓
DB
```

---

# 25. AI Features

نسخه اول حداقل این‌ها را داشته باشد:

### 1. ساخت شجره از متن

مثلاً:

> داستان خانواده من را تبدیل به شجره کن.

### 2. افزودن اطلاعات با متن

> برای احمد بنویس که در سال ۱۳۲۰ در پاوه متولد شده.

### 3. توضیح رابطه

> رابطه من با علی چیست؟

### 4. پیشنهاد اتصال

> آیا این دو احمد ممکن است یک نفر باشند؟

### 5. خلاصه زندگی

از اطلاعات فرد یک biography خوانا بسازد.

---

# 26. Media

از Cloudflare R2 برای media استفاده شود.

کاربر بتواند:

* عکس آپلود کند
* عکس پروفایل انتخاب کند
* چند عکس به یک شخص متصل کند
* اسناد آپلود کند
* عکس خانوادگی ثبت کند

Media database metadata داشته باشد.

---

# 27. Photo Experience

عکس‌ها باید بخش مهم محصول باشند.

در Person page:

```text
عکس‌های احمد
```

به شکل gallery نمایش داده شوند.

برای هر عکس امکان:

* caption
* date
* location
* people tagged

وجود داشته باشد.

در نسخه آینده امکان face recognition می‌تواند اضافه شود، ولی در MVP لازم نیست.

---

# 28. Stories

برای هر خانواده یا شخص امکان ثبت داستان وجود داشته باشد.

مثلاً:

> خاطره مهاجرت خانواده در سال ۱۳۴۵

شامل:

* عنوان
* متن
* عکس
* افراد مرتبط
* تاریخ
* محل

باشد.

این بخش می‌تواند بعدها تبدیل به family history / blog شود.

---

# 29. Timeline

برای هر شخص و خانواده timeline ایجاد کن.

مثلاً:

```text
۱۳۰۰
تولد

۱۳۲۰
ازدواج

۱۳۲۲
تولد محمد

۱۳۲۵
تولد علی

۱۳۵۵
وفات
```

Timeline باید روی موبایل بسیار readable باشد.

---

# 30. Import / Export

معماری را از ابتدا برای import/export آماده کن.

حداقل:

```text
JSON
GEDCOM
```

اگر GEDCOM در MVP پیچیده است، implementation کامل آن را به فاز بعد منتقل کن ولی data model را طوری طراحی کن که بعدها اضافه کردن GEDCOM دردناک نباشد.

---

# 31. Audit Log

هر تغییر مهم باید ثبت شود.

مثلاً:

```text
رمضان
احمد قادری
تاریخ تولد را تغییر داد
```

Audit log:

```text
user_id
entity_type
entity_id
action
before
after
created_at
```

---

# 32. Security

امنیت را جدی بگیر.

حداقل:

* authorization server-side
* input validation
* schema validation
* rate limiting برای AI
* rate limiting برای authentication
* CSRF protection در صورت نیاز
* secure cookies
* جلوگیری از IDOR
* جلوگیری از unauthorized family access
* file type validation
* file size limits
* signed/private media URLs در صورت نیاز

هیچ داده private نباید فقط با مخفی کردن frontend محافظت شود.

---

# 33. Performance

Mobile performance بسیار مهم است.

هدف:

* fast initial load
* lazy loading
* code splitting
* image optimization
* pagination
* virtualized lists در صورت نیاز
* cache مناسب

Treeهای بزرگ نباید کل database را یکجا به browser بفرستند.

فقط graph مورد نیاز را fetch کن.

---

# 34. Offline / Poor Connection

کاربر ممکن است اینترنت ضعیف داشته باشد.

برای عملیات غیرحساس UI باید optimistic UI مناسب داشته باشد.

در صورت امکان:

* cache
* retry
* loading state
* skeleton
* graceful failure

پیاده‌سازی شود.

---

# 35. UX

هیچ صفحه‌ای نباید بن‌بست داشته باشد.

برای هر حالت:

```text
Loading
Empty
Error
Success
Unauthorized
Not Found
```

UI مناسب بساز.

مثلاً اگر خانواده هنوز کسی ندارد:

> هنوز کسی به این شجره اضافه نشده است.

و:

```text
[ افزودن اولین نفر ]
[ ساخت با هوش مصنوعی ]
```

---

# 36. Navigation

Mobile navigation را ترجیحاً به شکل bottom navigation یا mobile-friendly navigation طراحی کن.

موارد مهم:

```text
خانه
شجره
جستجو
افزودن
پروفایل
```

گزینه‌های کم‌اهمیت‌تر داخل menu قرار بگیرند.

Desktop می‌تواند sidebar داشته باشد.

---

# 37. Add Person UX

فرم افزودن شخص نباید طولانی و ترسناک باشد.

مرحله اول:

```text
نام
نام خانوادگی
جنسیت
```

بعد:

```text
والدین
همسر
فرزندان
```

و سپس اطلاعات تکمیلی.

Progressive disclosure استفاده کن.

---

# 38. Add Relationship UX

کاربر باید بتواند از صفحه شخص بگوید:

```text
+ افزودن رابطه
```

سپس:

```text
نوع رابطه:
[ پدر ]
[ مادر ]
[ همسر ]
[ فرزند ]
[ خواهر/برادر ]
```

سپس شخص موجود را search کند یا شخص جدید بسازد.

---

# 39. Duplicate Detection

قبل از ایجاد شخص جدید، سیستم باید بتواند افراد مشابه را پیشنهاد دهد.

مثلاً:

```text
فرد مشابه پیدا شد:

احمد قادری
متولد حدود ۱۳۰۰
پاوه

آیا همان شخص است؟

[ بله ]
[ خیر، فرد جدید ]
```

این قابلیت باید deterministic rules + AI suggestion داشته باشد.

---

# 40. Admin Panel

Admin dashboard باید شامل:

```text
کاربران
خانواده‌ها
افراد
گزارش‌ها
AI usage
Media
Audit logs
System settings
```

باشد.

Admin بتواند:

* user disable/enable
* role تغییر دهد
* family مشاهده کند
* گزارش abuse دریافت کند
* usage AI را ببیند

---

# 41. Analytics

از ابتدا analytics داخلی حداقلی داشته باش.

مثلاً:

```text
users_count
families_count
persons_count
relationships_count
media_count
ai_requests_count
```

اطلاعات حساس genealogy را برای analytics ارسال نکن.

---

# 42. Data Ownership

کاربر باید بتواند داده خود را export کند.

اصل مهم:

**داده خانواده متعلق به خانواده است، نه AI.**

AI فقط ابزار پردازش است.

---

# 43. Component Architecture

Componentها باید reusable باشند.

مثلاً:

```text
PersonCard
PersonAvatar
RelationshipCard
FamilyCard
TreeNode
TreeCanvas
Timeline
MediaGallery
PersonPicker
FamilyPicker
SearchInput
EmptyState
LoadingState
ConfirmDialog
AIComposer
AIProposal
```

---

# 44. Design System

قبل از ساخت صفحات متعدد، design system پایه را بساز.

شامل:

* typography
* spacing
* radius
* shadows
* buttons
* inputs
* cards
* dialogs
* bottom sheets
* tabs
* badges
* avatars

---

# 45. Persian Typography

فونت فارسی مناسب استفاده کن.

Typography باید:

* خوانا
* مدرن
* مناسب موبایل

باشد.

اعداد، تاریخ و متن فارسی باید ظاهر طبیعی داشته باشند.

---

# 46. Accessibility

حداقل:

* keyboard navigation
* semantic HTML
* aria labels
* contrast
* focus states
* touch targets حداقل مناسب موبایل

را رعایت کن.

---

# 47. No Fake Features

هیچ featureای را با fake UI نشان نده.

اگر backend هنوز وجود ندارد:

TODO یا placeholder واضح داشته باش.

اما در نسخه نهایی MVP:

**دکمه‌ای که هیچ کاری نمی‌کند ممنوع است.**

---

# 48. No Hardcoded Demo Logic

داده‌های نمونه فقط برای development باشند.

منطق برنامه نباید به sample data وابسته باشد.

---

# 49. Testing

حداقل تست:

### Unit

* relationship logic
* date parsing
* Persian normalization
* privacy logic
* AI schema validation

### Integration

* authentication
* family access
* person creation
* relationship creation
* AI proposal confirmation

### E2E

با Playwright:

```text
register/login
create family
add person
add relationship
open tree
search person
upload photo
AI proposal
confirm AI proposal
```

---

# 50. Visual QA

بعد از ساخت UI:

1. application را اجرا کن
2. با Playwright از صفحات اصلی screenshot بگیر
3. موبایل را بررسی کن
4. tablet را بررسی کن
5. desktop را بررسی کن
6. dark mode را بررسی کن
7. مشکلات overflow را پیدا کن
8. typography را بررسی کن
9. spacing را بررسی کن
10. دوباره اصلاح کن

حداقل این viewportها:

```text
390x844
430x932
768x1024
1440x900
```

---

# 51. Mobile QA Checklist

حتماً بررسی کن:

* هیچ horizontal scroll ناخواسته‌ای وجود نداشته باشد
* buttons قابل لمس باشند
* modal از صفحه خارج نشود
* tree قابل استفاده باشد
* keyboard روی فرم‌ها layout را خراب نکند
* bottom navigation با safe-area کار کند
* عکس‌ها overflow نکنند
* متن فارسی قطع نشود
* dark mode تمام صفحات را پوشش دهد

---

# 52. SEO

صفحات عمومی خانواده/افراد در صورت فعال بودن public visibility باید SEO-friendly باشند.

اما اطلاعات private نباید index شوند.

---

# 53. Error Handling

Errorها باید user-friendly باشند.

مثلاً به جای:

```text
SQLITE_CONSTRAINT_FOREIGNKEY
```

نمایش بده:

> امکان ذخیره این رابطه وجود ندارد. لطفاً اطلاعات فرد مقابل را بررسی کنید.

خطای واقعی در log ثبت شود.

---

# 54. API Design

API باید تمیز و resource-oriented باشد.

مثلاً:

```text
/api/auth/*
/api/families/*
/api/persons/*
/api/relationships/*
/api/media/*
/api/search/*
/api/ai/*
/api/admin/*
```

Business logic را داخل route handlerها انباشته نکن.

---

# 55. Service Layer

حداقل:

```text
AuthService
FamilyService
PersonService
RelationshipService
MediaService
SearchService
GenealogyAIService
PrivacyService
AuditService
```

---

# 56. Transactions

عملیات‌های چندمرحله‌ای مثل:

```text
create person
+
create relationship
+
create audit log
```

باید atomic باشند.

---

# 57. AI Prompting

Promptهای AI را داخل source code پراکنده نکن.

یک لایه مشخص داشته باش:

```text
ai/prompts/
ai/schemas/
ai/providers/
ai/services/
```

---

# 58. AI Safety

AI باید صریحاً instructed شود:

```text
Never invent genealogical facts.
Never assume missing relationships.
Never merge people automatically.
Never overwrite existing facts without confirmation.
```

---

# 59. AI Explainability

برای هر پیشنهاد AI، در صورت امکان مشخص کن:

```text
استخراج‌شده از متن شما
```

یا:

```text
پیشنهاد هوش مصنوعی
```

کاربر باید بداند کدام اطلاعات را خودش داده و کدام پیشنهاد AI است.

---

# 60. Future Architecture

در طراحی فعلی راه را برای این قابلیت‌ها نبند:

* چند شجره برای یک کاربر
* همکاری خانوادگی
* invitation
* real-time collaboration
* notifications
* GEDCOM کامل
* PDF family book
* چاپ شجره
* map
* historical locations
* face recognition
* AI family historian
* voice-to-genealogy
* DNA information
* public family pages

ولی همه این‌ها را در MVP پیاده نکن.

---

# 61. MVP

اول این موارد را کامل و production-quality بساز:

## Authentication

* login
* register
* logout
* session

## User

* profile
* avatar
* settings
* theme

## Family

* create family
* family dashboard

## Persons

* create
* edit
* delete
* view

## Relationships

* parent
* child
* spouse

## Tree

* ancestors
* descendants
* family view

## Search

* person search

## Media

* photo upload

## AI

* text → genealogy proposal
* review
* confirm

## Admin

* users
* families
* basic statistics

## Responsive

* mobile
* tablet
* desktop

## Dark mode

کامل.

---

# 62. Implementation Strategy

این پروژه را یکجا و بدون بررسی نساز.

مرحله‌بندی:

### Phase 1

Architecture + database + authentication.

### Phase 2

Family + person + relationships.

### Phase 3

Tree visualization.

### Phase 4

Mobile UX refinement.

### Phase 5

Media.

### Phase 6

AI structured extraction.

### Phase 7

Admin.

### Phase 8

Search + privacy.

### Phase 9

Testing.

### Phase 10

Visual QA.

---

# 63. مهم: قبل از Coding

قبل از شروع implementation:

1. repository را بررسی کن
2. environment را بررسی کن
3. package manager موجود را تشخیص بده
4. Cloudflare compatibility را بررسی کن
5. architecture plan بساز
6. database schema بساز
7. route structure تعیین کن
8. component architecture تعیین کن

سپس implementation را شروع کن.

اگر repository از قبل کد دارد، بدون بررسی آن را overwrite نکن.

---

# 64. مهم: تصمیمات فنی

اگر بین چند راه‌حل مردد هستی:

راه‌حلی را انتخاب کن که:

1. ساده‌تر باشد
2. Cloudflare-compatible باشد
3. maintainable باشد
4. type-safe باشد
5. mobile-friendly باشد
6. بعدها قابل توسعه باشد

از over-engineering جلوگیری کن.

---

# 65. Code Quality

TypeScript strict mode.

No:

```text
any
```

مگر با دلیل واقعی.

No duplicated business logic.

No giant components.

No giant route handlers.

No secret داخل repository.

Environment variables برای secrets.

---

# 66. Definition of Done

Feature زمانی Done است که:

* backend کار کند
* frontend کار کند
* database واقعی باشد
* validation وجود داشته باشد
* authorization وجود داشته باشد
* mobile کار کند
* dark mode کار کند
* loading state داشته باشد
* empty state داشته باشد
* error state داشته باشد
* تست مناسب داشته باشد
* screenshot QA انجام شده باشد

---

# 67. Product Philosophy

این محصول باید حس یک:

**«آرشیو زنده خانواده»**

را منتقل کند.

نه یک database خشک.

کاربر باید بتواند احساس کند:

> «اینجا تاریخ خانواده من زندگی می‌کند.»

در طراحی از ترکیب:

* افراد
* عکس‌ها
* داستان‌ها
* timeline
* روابط
* مکان‌ها
* شجره

استفاده کن.

---

# 68. مهم‌ترین UX

کاربر جدید باید بتواند در کمتر از چند دقیقه:

```text
ثبت‌نام
   ↓
ساخت خانواده
   ↓
ثبت خودش
   ↓
ثبت پدر و مادر
   ↓
مشاهده اولین شجره
```

را انجام دهد.

و حتی سریع‌تر:

```text
ثبت‌نام
 ↓
"داستان خانواده‌ات را بنویس"
 ↓
AI
 ↓
پیشنهاد شجره
 ↓
تأیید
```

را تجربه کند.

---

# 69. Final Instruction

تو نباید فقط چیزی بسازی که technically works.

باید محصولی بسازی که:

* زیبا باشد
* سریع باشد
* قابل استفاده باشد
* موبایل‌محور باشد
* فارسی را درست نمایش دهد
* داده‌ها را امن نگه دارد
* معماری قابل توسعه داشته باشد
* Cloudflare-ready باشد
* AI را به شکل واقعی و قابل اعتماد استفاده کند

و مهم‌تر از همه:

**قبل از هر تصمیم بزرگ، مسئله را تحلیل کن و سپس implementation را انجام بده.**

هر جا راه‌حل ساده‌تر و حرفه‌ای‌تری وجود دارد، همان را انتخاب کن.

Do not sacrifice product quality for speed.
