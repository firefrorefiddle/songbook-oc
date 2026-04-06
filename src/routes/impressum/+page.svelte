<script lang="ts">
	interface ImpressumData {
		companyName: string | null;
		street: string | null;
		city: string | null;
		contactEmail: string | null;
		phone: string | null;
		vatId: string | null;
	}

	let { data } = $props() as { data: ImpressumData };
</script>

<svelte:head>
	<title>Impressum – Songbook</title>
</svelte:head>

<div class="max-w-2xl mx-auto">
	<h1 class="text-2xl font-bold text-gray-900 mb-6">Impressum</h1>

	<div class="bg-white shadow-sm rounded-lg border border-gray-200 p-6 space-y-6">
		<section>
			<h2 class="text-lg font-medium text-gray-900 mb-2">Angaben gemäß Abschnitt 5 ECG</h2>
			<p class="text-gray-700">
				{data.companyName || 'Songbook-OC'}<br />
				{data.street || 'Straße example'}<br />
				{data.city || 'PLZ Ort'}
			</p>
		</section>

		<section>
			<h2 class="text-lg font-medium text-gray-900 mb-2">Kontakt</h2>
			<p class="text-gray-700">
				E-Mail: {data.contactEmail || 'contact@example.com'}
				{#if data.phone}
					<br />
					Telefon: {data.phone}
				{/if}
			</p>
		</section>

		{#if data.vatId}
			<section>
				<h2 class="text-lg font-medium text-gray-900 mb-2">Umsatzsteuer-ID</h2>
				<p class="text-gray-700">{data.vatId}</p>
			</section>
		{/if}

		<section>
			<h2 class="text-lg font-medium text-gray-900 mb-2">Haftung für Inhalte</h2>
			<p class="text-gray-700 text-sm">
				Die Inhalte unserer Seite wurden mit größter Sorgfalt erstellt. Für die Richtigkeit,
				Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen.
				Als Diensteanbieter sind wir gemäß Paragraf 7 Absatz 1 TMG für eigene Inhalte auf diesen Seiten
				nach den allgemeinen Gesetzen verantwortlich. Nach den Paragraphen 8 bis 10 TMG sind wir als
				Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde
				Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige
				Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von
				Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche
				Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten
				Rechtsverletzung möglich. Bei Bekanntwerden von entsprechenden Rechtsverletzungen werden
				wir diese Inhalte umgehend entfernen.
			</p>
		</section>

		<section>
			<h2 class="text-lg font-medium text-gray-900 mb-2">Haftung für Links</h2>
			<p class="text-gray-700 text-sm">
				Unser Angebot enthält Links zu externen Webseiten Dritter, auf deren Inhalte wir keinen
				Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen.
				Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der
				Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf
				mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der
				Verlinkung nicht erkennbar. Eine permanente inhaltliche Kontrolle der verlinkten Seiten
				ist jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei
				Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend entfernen.
			</p>
		</section>

		<section>
			<h2 class="text-lg font-medium text-gray-900 mb-2">Datenschutz</h2>
			<p class="text-gray-700 text-sm">
				Die Nutzung unserer Webseite ist in der Regel ohne Angabe personenbezogener Daten
				möglich. Soweit auf unseren Seiten personenbezogene Daten (beispielsweise Name,
				Anschrift oder E-Mail-Adressen) erhoben werden, erfolgt dies, soweit möglich, stets
				auf freiwilliger Basis. Diese Daten werden ohne Ihre ausdrückliche Zustimmung nicht an
				Dritte weitergegeben. Wir weisen darauf hin, dass die Datenübertragung im Internet
				(z.B. bei der Kommunikation per E-Mail) Sicherheitslücken aufweisen kann. Ein
				lückenloser Schutz der Daten vor dem Zugriff durch Dritte ist nicht möglich.
			</p>
		</section>
	</div>
</div>
