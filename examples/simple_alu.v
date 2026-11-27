// Four-bit combinational ALU: op=0 adds, op=1 XORs.
module simple_alu(input [3:0] a, input [3:0] b, input op, output reg [3:0] result, output zero);
  always @* begin
    if (op) result = a ^ b;
    else result = a + b;
  end
  assign zero = (result == 4'b0000);
endmodule
