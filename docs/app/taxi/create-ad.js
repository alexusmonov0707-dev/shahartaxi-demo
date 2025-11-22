<!DOCTYPE html>
<html lang="uz">
<head>
    <meta charset="UTF-8" />
    <title>Yangi e’lon qo‘shish</title>

    <style>
        body { font-family: Arial; background:#f3f3f3; margin:0; }
        .card { max-width:600px; margin:20px auto; background:white;
                padding:20px; border-radius:12px; }
        input, select, textarea { width:100%; padding:12px; margin-top:10px; }
        button { width:100%; padding:12px; margin-top:15px; border:none; cursor:pointer; }
        .blue { background:#007bff; color:white; }
    </style>
</head>
<body>

<div class="card">

    <select id="fromRegion"><option value="">Viloyat</option></select>
    <select id="fromDistrict"><option value="">Tuman</option></select>

    <select id="toRegion"><option value="">Viloyat</option></select>
    <select id="toDistrict"><option value="">Tuman</option></select>

    <input id="price" type="number" placeholder="Narx (so‘m)" />
    <input id="departureTime" type="datetime-local" />
    <input id="seats" type="number" placeholder="Joylar soni" />
    <textarea id="adComment" rows="3" placeholder="Izoh"></textarea>

    <button id="submitAdBtn" class="blue">E’lonni joylash</button>
</div>

<!-- REGIONS -->
<script src="/shahartaxi-demo/assets/regions-taxi.js"></script>
<script src="/shahartaxi-demo/assets/regions-helper.js"></script>

<!-- OUR JS -->
<script type="module" src="/shahartaxi-demo/app/taxi/create-ad.js"></script>

</body>
</html>
