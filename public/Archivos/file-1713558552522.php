
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-T3c6CoIi6uLrA9TneNEoa7RxnatzjcDSCmG1MXxSR1GAsXEV/Dwwykc2MPK8M2HN" crossorigin="anonymous">
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js" integrity="sha384-C6RzsynM9kWDrMNeT87bh95OGNyZPhcTNXj1NW7RuBCsyN/o0jlpcV8Qyq46cDfL" crossorigin="anonymous"></script>
<script src="js/jquery-3.5.1.min.js"></script>
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <title>Soy un Titulo</title>
  </head>
  <body>
   <div class="container-fluid">
    <div class="row">
      <div class="col">
        <label>Atributo</label><br>
        <input type="text" value="" id="atributo" tabindex="3" nombre="yaselasaben"><br><br>
        <button class="btn btn-success" id="boton_atributo" >Boton Atributo</button>
      </div>
      <div class="col">
        <label>Focus</label><br>
        <input type="text" value="La purga" tabindex="2" id="input_focus" nombre="purga"><br>
      </div>
      <div class="col">
        <label>Key Up</label><br>
        <input type="text" value=" " tabindex="1"id="input_up" edad="69"><br>
      </div>
      <div class="col">
        <label>Key Down</label><br>
        <input type="text" value="" tabindex="0" id="input_down" nacimiento="cercas"><br>
      </div>
      <div class="col-2">
        <br>
        <button class="btn btn-success" id="boton_peque" >Boton Pequeño</button>
      </div>
    </div>
  </div>
  <script>
  $(document).ready(function(e) {
    $(document).on("click","#boton_atributo",function(){
      console.log("Atributo: "+$("#atributo").attr("nombre"));
      console.log("Valor: "+$("#atributo").val());
      console.log("Id: "+$("#atributo").attr("id"));
    });
    $(document).on("focus","#input_focus",function(){
      console.log("Atributo: "+$("#input_focus").attr("nombre"));
      console.log("Valor: "+$("#input_focus").val());
      console.log("Id: "+$("#input_focus").attr("id"));
    });	
    $(document).on("keyup","#input_up",function(){
      console.log("Atributo: "+$("#input_up").attr("edad"));
      console.log("Valor: "+$("#input_up").val());
      console.log("Id: "+$("#input_up").attr("id"));
    });	
    $(document).on("keydown","#input_down",function(){
      console.log("Atributo: "+$("#input_down").attr("nacimiento"));
      console.log("Valor: "+$("#input_down").val());
      console.log("Id: "+$("#input_down").attr("id"));
    });
    $(document).on("click","#boton_atributo",function(){
      var datos = $("#atributo").val();
      if(datos==''){
        console.log("Ingresa los datos");
        $("#atributo").focus();
      }else{
        funciones(datos,"frank",233);
      }
      
    });	
    function funciones(datos,nombre,numero){
      //alert("Alerta en la funcion");
      console.log("Entro a la Funcion: "+datos+" nombre:"+nombre+" numero:"+numero);
      //$("#atributo").focus();
    }
    $(document).keypress(function(e) {
      console.log(e.which);
      if(e.which == 13) {
        console.log("Tecleaste un enter");
      }
	  });
  });
  </script>
  </body>
</html>
