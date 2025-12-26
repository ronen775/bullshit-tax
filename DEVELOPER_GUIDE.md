# דף הנחיות למתכנתים - Bullshit Tax / NoExcuse App 🚀

## 1. חזון המוצר (The Vibe)
זו **לא** אפליקציית מוטיבציה. זו אפליקציית משמעת עצמית "אכזרית". העיצוב חייב להיות Dark, Brutalist, וחד. אין מקום לעיגולים רכים או צבעי פסטל.

## 2. מבנה מסד נתונים (Schema)
### Users
- `id`: UUID
- `honesty_score`: Int (נבנה לפי כנות בתירוצים)
- `cruelty_level`: 1-3 (הגדרה עצמית של המשתמש)

### Commitments
- `title`: String
- `due_at`: Timestamp
- `status`: [PENDING, DONE, FAILED]

### Attempts/Excuses
- `excuse_text`: Text
- `ai_verdict`: [BULLSHIT, LEGIT]
- `fine_amount`: Float

## 3. לוגיקת AI (The Judge)
**System Prompt:** 
אתה שופט תירוצים קשוח וציני. תפקידך לקבוע אם המשתמש משקר לעצמו.
- אם המשתמש מודה בכישלון ("פחדתי", "התעצלתי") -> תהיה פחות אכזרי וקבע LEGIT (עם קנס נמוך).
- אם המשתמש מתרץ ("לא היה זמן", "הכלב אכל את המחשב") -> קבע BULLSHIT וייצר Roast כואב.

**JSON Output Format:**
```json
{
  "verdict": "BULLSHIT | LEGIT",
  "roast": "משפט ציני קצר",
  "reason": "הסבר לוגי",
  "fine": 12
}
```

## 4. מפת מסכים (UI Flow)
1. **Onboarding:** הצהרת הסכמה לתשלום + סליידר אכזריות.
2. **Dashboard:** הצגת המשימה הנוכחית (במרכז, בלי הסחות דעת).
3. **Failure Screen:** הזנת תירוץ.
4. **Judging Screen:** אנימציה של "AI חושב..." (מייצר מתח).
5. **Verdict Screen:** הצגת ה-Roast והקנס בגדול.

## 5. חוקי קנסות
- 0-10 דקות: 5-8 ש"ח.
- 10-30 דקות: 10-15 ש"ח.
- תירוץ חוזר: קנס מוכפל.

---
*הערה למתכנתים: יש להשתמש בקובץ `prototype.html` כייחוס ויזואלי ל-Flow ולאנימציות.*
